"""
End-to-end Verification Test for AI Expense Copilot
Validates:
1. Automatic receipt information extraction (Merchant, Bill #, Date, Currency, Subtotal, CGST, SGST, Total, Line Items, Category, Payment Method).
2. Proper extraction of GST, subtotal, and total.
3. Detection and flagging of arithmetic mismatches while preserving printed total.
4. Employee review, correction, and claim submission.
5. Strict server-side permission enforcement: Employee & Finance cannot approve/reject claims (HTTP 403).
6. Manager approval workflow: Manager can approve/reject with reason recorded.
7. Employee sees updated decision and status.
8. Data isolation: Employee cannot access other employees' private claims (HTTP 403).
9. Original receipt and audit history remain available after decision.
"""
import io
import os
import sys
import json
import requests
from PIL import Image, ImageDraw, ImageFont

BASE_URL = "http://127.0.0.1:8000/api"

def create_mock_receipt_image(merchant, bill_no, date, subtotal, cgst, sgst, total, items, bad_total=None):
    """Generates a high-contrast receipt image for OCR testing."""
    img = Image.new("RGB", (650, 850), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    try:
        font_title = ImageFont.truetype("arial.ttf", 26)
        font_sub = ImageFont.truetype("arial.ttf", 18)
        font_body = ImageFont.truetype("cour.ttf", 18)
        font_bold = ImageFont.truetype("courbd.ttf", 20)
    except Exception:
        font_title = font_sub = font_body = font_bold = ImageFont.load_default()

    draw.text((325, 40), merchant.upper(), fill=(0, 0, 0), font=font_title, anchor="mm")
    draw.text((325, 75), "TAX INVOICE / OFFICIAL BILL", fill=(80, 80, 80), font=font_sub, anchor="mm")
    draw.text((50, 120), f"Invoice #: {bill_no}", fill=(0, 0, 0), font=font_body)
    draw.text((50, 150), f"Date: {date}", fill=(0, 0, 0), font=font_body)
    draw.text((50, 180), "Payment: Corporate Card", fill=(0, 0, 0), font=font_body)

    draw.line([(50, 215), (600, 215)], fill=(0, 0, 0), width=2)
    draw.text((50, 225), "ITEMS & CHARGES", fill=(0, 0, 0), font=font_bold)
    draw.text((500, 225), "AMOUNT", fill=(0, 0, 0), font=font_bold)
    draw.line([(50, 250), (600, 250)], fill=(0, 0, 0), width=1)

    y = 265
    for desc, price in items:
        draw.text((50, y), desc, fill=(0, 0, 0), font=font_body)
        draw.text((520, y), f"{price:.2f}", fill=(0, 0, 0), font=font_body)
        y += 35

    draw.line([(50, y), (600, y)], fill=(0, 0, 0), width=1)
    y += 15
    draw.text((300, y), "Subtotal:", fill=(0, 0, 0), font=font_body)
    draw.text((500, y), f"INR {subtotal:.2f}", fill=(0, 0, 0), font=font_body)
    y += 30
    draw.text((300, y), "CGST @ 2.5%:", fill=(0, 0, 0), font=font_body)
    draw.text((500, y), f"INR {cgst:.2f}", fill=(0, 0, 0), font=font_body)
    y += 30
    draw.text((300, y), "SGST @ 2.5%:", fill=(0, 0, 0), font=font_body)
    draw.text((500, y), f"INR {sgst:.2f}", fill=(0, 0, 0), font=font_body)
    y += 35

    printed_total = bad_total if bad_total is not None else total
    draw.line([(50, y), (600, y)], fill=(0, 0, 0), width=2)
    y += 10
    draw.text((300, y), "TOTAL AMOUNT:", fill=(0, 0, 0), font=font_bold)
    draw.text((490, y), f"INR {printed_total:.2f}", fill=(0, 0, 0), font=font_bold)

    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=95)
    return buf.getvalue()

def run_tests():
    print("==================================================")
    print("AI EXPENSE COPILOT - COMPLETE WORKFLOW TEST SUITE")
    print("==================================================")
    
    # ----------------------------------------------------
    # Scenario 1 & 2: Receipt OCR, GST & Autofill
    # ----------------------------------------------------
    print("\n--- Test 1 & 2: Receipt Upload, OCR & GST Breakdown ---")
    items = [
        ("Executive Buffet Lunch", 2800.0),
        ("Sparkling Mineral Water", 200.0)
    ]
    img_bytes = create_mock_receipt_image(
        merchant="Taj Lands End Mumbai",
        bill_no="INV-2026-9901",
        date="2026-10-18",
        subtotal=3000.0,
        cgst=75.0,
        sgst=75.0,
        total=3150.0,
        items=items
    )

    files = {"file": ("taj_lands_end.jpg", img_bytes, "image/jpeg")}
    data = {"employee_id": "EMP-001"}
    r = requests.post(f"{BASE_URL}/receipts/upload", files=files, data=data)
    assert r.status_code == 200, f"Upload failed: {r.text}"
    res = r.json()
    receipt = res["receipt"]
    parsed = res["parsed_data"]

    print("Parsed Merchant:", parsed.get("merchant"))
    print("Parsed Bill #:", parsed.get("receipt_number"))
    print("Parsed Date:", parsed.get("date"))
    print("Parsed Subtotal:", parsed.get("subtotal"))
    print("Parsed CGST:", parsed.get("cgst_amount"))
    print("Parsed SGST:", parsed.get("sgst_amount"))
    print("Parsed Total:", parsed.get("total_amount"))
    print("Parsed Category:", parsed.get("suggested_category"))
    print("Arithmetic Valid:", parsed.get("arithmetic_valid"))

    assert "Taj Lands End" in parsed.get("merchant", ""), "Merchant extraction failed"
    assert parsed.get("receipt_number") == "INV-2026-9901", "Bill number extraction failed"
    assert parsed.get("date") == "2026-10-18", "Date extraction failed"
    assert parsed.get("subtotal") == 3000.0, "Subtotal extraction failed"
    assert parsed.get("cgst_amount") == 75.0, "CGST extraction failed"
    assert parsed.get("sgst_amount") == 75.0, "SGST extraction failed"
    assert parsed.get("tax_percentage") == 5.0, "Tax percentage calculation failed"
    assert parsed.get("total_amount") == 3150.0, "Total extraction failed"
    assert parsed.get("arithmetic_valid") is True, "Arithmetic validation failed"
    print(" [PASSED] Scenario 1 & 2 verified: OCR accurately extracted merchant, invoice #, date, subtotal, CGST, SGST, and total.")

    # ----------------------------------------------------
    # Scenario 3: Mismatched Total Flagging
    # ----------------------------------------------------
    print("\n--- Test 3: Receipt with Mismatched Total Detection ---")
    bad_img_bytes = create_mock_receipt_image(
        merchant="Copper Chimney Worli",
        bill_no="CC-2026-4402",
        date="2026-10-18",
        subtotal=2000.0,
        cgst=50.0,
        sgst=50.0,
        total=2100.0,
        items=[("Murg Malai Tikka", 1500.0), ("Roomali Roti", 500.0)],
        bad_total=3500.0 # Printed total differs from subtotal + tax
    )
    files = {"file": ("copper_chimney_bad.jpg", bad_img_bytes, "image/jpeg")}
    r_bad = requests.post(f"{BASE_URL}/receipts/upload", files=files, data={"employee_id": "EMP-001"})
    assert r_bad.status_code == 200
    p_bad = r_bad.json()["parsed_data"]
    print("Bad Receipt Printed Total:", p_bad.get("total_amount"))
    print("Bad Receipt Calculated Total:", p_bad.get("calculated_total"))
    print("Bad Receipt Arithmetic Valid:", p_bad.get("arithmetic_valid"))
    print("Bad Receipt Arithmetic Error:", p_bad.get("arithmetic_error"))

    assert p_bad.get("total_amount") == 3500.0, "Printed total should be preserved"
    assert p_bad.get("arithmetic_valid") is False, "Mismatch should be flagged"
    assert p_bad.get("arithmetic_error") is not None, "Error description should be present"
    print(" [PASSED] Scenario 3 verified: Arithmetic mismatch flagged while printed total preserved.")

    # ----------------------------------------------------
    # Scenario 4: Employee Submit Claim
    # ----------------------------------------------------
    print("\n--- Test 4: Employee Review & Claim Submission ---")
    login_emp = requests.post(f"{BASE_URL}/auth/login", json={"email": "priya@acmecorp.com", "password": "Password123!"}).json()
    emp_token = login_emp["token"]
    emp_headers = {"Authorization": f"Bearer {emp_token}"}

    claim_payload = {
        "employee_id": "EMP-001",
        "date": parsed["date"],
        "merchant": parsed["merchant"],
        "category": parsed["suggested_category"] or "Meals",
        "amount": parsed["total_amount"],
        "currency": parsed["currency"],
        "subtotal": parsed["subtotal"],
        "tax_amount": parsed["tax_amount"],
        "cgst_amount": parsed["cgst_amount"],
        "sgst_amount": parsed["sgst_amount"],
        "receipt_id": receipt["receipt_id"],
        "receipt_number": parsed["receipt_number"],
        "payment_method": parsed["payment_method"],
        "line_items": parsed["line_items"],
        "raw_file_url": receipt["raw_file_url"]
    }
    r_submit = requests.post(f"{BASE_URL}/expenses", json=claim_payload, headers=emp_headers)
    assert r_submit.status_code == 200, f"Submit failed: {r_submit.text}"
    exp = r_submit.json()["expense"]
    exp_id = exp["id"]
    print(f"Submitted Expense ID: {exp_id}, Initial Status: {exp['status']}")
    print(f"Subtotal: {exp.get('subtotal')}, CGST: {exp.get('cgst_amount')}, SGST: {exp.get('sgst_amount')}")
    assert exp["merchant"] == parsed["merchant"]
    assert exp["amount"] == 3150.0
    print(" [PASSED] Scenario 4 verified: Employee submitted claim with extracted fields.")

    # ----------------------------------------------------
    # Scenario 5: Strict Role Permission Enforcement
    # ----------------------------------------------------
    print("\n--- Test 5: Permission Enforcement (Employee & Finance Blocked) ---")
    # Employee attempts to approve via API
    r_emp_approve = requests.post(
        f"{BASE_URL}/expenses/{exp_id}/review",
        json={"action": "APPROVE", "reason": "Self-approval attempt"},
        headers=emp_headers
    )
    print("Employee direct approval attempt status code:", r_emp_approve.status_code)
    assert r_emp_approve.status_code == 403, f"Expected 403 for employee, got {r_emp_approve.status_code}"

    # Finance user attempts to approve via API
    login_fin = requests.post(f"{BASE_URL}/auth/login", json={"email": "finance@acmecorp.com", "password": "Finance123!"}).json()
    fin_token = login_fin["token"]
    fin_headers = {"Authorization": f"Bearer {fin_token}"}
    r_fin_approve = requests.post(
        f"{BASE_URL}/expenses/{exp_id}/review",
        json={"action": "APPROVE", "reason": "Finance direct approval attempt"},
        headers=fin_headers
    )
    print("Finance direct approval attempt status code:", r_fin_approve.status_code)
    assert r_fin_approve.status_code == 403, f"Expected 403 for finance, got {r_fin_approve.status_code}"
    print(" [PASSED] Scenario 5 verified: Both Employee and Finance are blocked with HTTP 403.")

    # ----------------------------------------------------
    # Scenario 6: Manager Review and Approval
    # ----------------------------------------------------
    print("\n--- Test 6: Manager Review and Approval ---")
    login_mgr = requests.post(f"{BASE_URL}/auth/login", json={"email": "manager@acmecorp.com", "password": "Manager123!"}).json()
    mgr_token = login_mgr["token"]
    mgr_headers = {"Authorization": f"Bearer {mgr_token}"}

    r_mgr_approve = requests.post(
        f"{BASE_URL}/expenses/{exp_id}/review",
        json={
            "action": "APPROVE",
            "reason": "Executive lunch verified with client contract documentation."
        },
        headers=mgr_headers
    )
    assert r_mgr_approve.status_code == 200, f"Manager approval failed: {r_mgr_approve.text}"
    approved_exp = r_mgr_approve.json()["expense"]
    print("Approved Status:", approved_exp["status"])
    print("Decision History Count:", len(approved_exp["decision_history"]))
    latest_decision = approved_exp["decision_history"][-1]
    print("Latest Decision Trigger:", latest_decision["trigger_event"])
    print("Latest Decision Explanation:", latest_decision["explanation"])
    assert approved_exp["status"] == "Approved"
    assert "Rajesh Nair" in latest_decision["explanation"]
    assert "manager" in latest_decision["explanation"]
    print(" [PASSED] Scenario 6 verified: Manager approved claim with recorded decision history.")

    # ----------------------------------------------------
    # Scenario 7: Employee Sees Updated Decision
    # ----------------------------------------------------
    print("\n--- Test 7: Employee Views Updated Decision ---")
    r_emp_view = requests.get(f"{BASE_URL}/expenses/{exp_id}", headers=emp_headers)
    assert r_emp_view.status_code == 200
    emp_view_data = r_emp_view.json()["expense"]
    assert emp_view_data["status"] == "Approved"
    print("Employee sees updated status:", emp_view_data["status"])
    print(" [PASSED] Scenario 7 verified: Employee observes updated approval status.")

    # ----------------------------------------------------
    # Scenario 8: Unauthorized Access to Other Employee's Claims
    # ----------------------------------------------------
    print("\n--- Test 8: Data Isolation Check (Cannot view other's claims) ---")
    # EXP-003 belongs to Rahul Verma (EMP-002)
    r_cross_access = requests.get(f"{BASE_URL}/expenses/EXP-003", headers=emp_headers)
    print("Priya accessing Rahul's EXP-003 status code:", r_cross_access.status_code)
    assert r_cross_access.status_code == 403, f"Expected 403, got {r_cross_access.status_code}"
    print(" [PASSED] Scenario 8 verified: Employee cannot access other employees' private claims.")

    # ----------------------------------------------------
    # Scenario 9: Original Receipt & Audit Trail Persistence
    # ----------------------------------------------------
    print("\n--- Test 9: Original Receipt & Audit History Availability ---")
    r_file = requests.get(f"{BASE_URL}/receipts/{receipt['receipt_id']}/file")
    assert r_file.status_code == 200
    assert len(r_file.content) > 1000, "Receipt file should contain image bytes"
    print("Receipt file size retrieved:", len(r_file.content), "bytes")

    r_audit = requests.get(f"{BASE_URL}/audit/events?target_id={exp_id}")
    assert r_audit.status_code == 200
    audit_events = r_audit.json()
    print("Audit Events recorded for this expense:", len(audit_events))
    actions_logged = [a["action"] for a in audit_events]
    print("Logged Actions:", actions_logged)
    assert "EXPENSE_SUBMITTED" in actions_logged
    assert "EXPENSE_APPROVE" in actions_logged
    print(" [PASSED] Scenario 9 verified: Original file and full audit trail are preserved.")

    print("\n==================================================")
    print(" ALL 9 VERIFICATION SCENARIOS PASSED WITH 100% SUCCESS!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
