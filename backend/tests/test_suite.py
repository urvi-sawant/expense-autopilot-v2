"""
Expense Autopilot Automated Test Suite
Verifies:
1. Deterministic policy evaluation
2. Expense Time Machine chronological recalculation
3. Duplicate Detective multi-factor similarity
4. Arithmetic mismatch detection
5. Non-reimbursable alcohol exclusion
6. High-value approval escalation
7. Foreign currency conversion
"""
import unittest
from database import db
from services.seed_data import load_seed_data
from services.policy_engine import evaluate_expense_policy, convert_to_inr
from services.ocr_engine import validate_arithmetic, check_excluded_items
from services.duplicate_detective import evaluate_duplicate_candidate
from services.time_machine import recalculate_affected_expenses

def setup_module():
    load_seed_data(clear_first=True)

def test_currency_conversion():
    amount_inr, rate = convert_to_inr(45.0, "USD")
    assert rate == 83.50
    assert amount_inr == 3757.50

def test_arithmetic_validation():
    items = [
        {"total_price": 750.0},
        {"total_price": 370.0}
    ]
    tax = 180.0
    printed_total = 1450.0
    # Calculated is 750 + 370 + 180 = 1300 vs 1450 printed
    valid, calc, err = validate_arithmetic(items, tax, printed_total)
    assert not valid
    assert calc == 1300.0
    assert "Arithmetic mismatch" in err

def test_excluded_items_alcohol():
    items = [
        {"description": "Pizza Margherita", "total_price": 600.0},
        {"description": "Craft Cocktail Spritz", "total_price": 450.0}
    ]
    annotated = check_excluded_items(items)
    assert not annotated[0]["is_excluded"]
    assert annotated[1]["is_excluded"]
    assert "prohibited by Corporate Policy" in annotated[1]["exclusion_reason"]

def test_duplicate_exact_match():
    exp1 = db.get_expense("EXP-009")
    exp2 = db.get_expense("EXP-010")
    score, factors, classification = evaluate_duplicate_candidate(exp1, exp2)
    assert score >= 80.0
    assert classification == "Likely Duplicate"
    assert any("Identical Receipt #" in f for f in factors)

def test_client_meal_missing_fields():
    exp = db.get_expense("EXP-008")
    emp = db.get_employee(exp["employee_id"])
    res = evaluate_expense_policy(exp, db.list_policy_rules(), emp)
    assert res["status"] == "Needs Clarification"
    assert "Attendee Count" in res["missing_fields"]
    assert "Client Name" in res["missing_fields"]

def test_high_value_escalation():
    exp = db.get_expense("EXP-012")  # 8,450 flight
    emp = db.get_employee(exp["employee_id"])
    res = evaluate_expense_policy(exp, db.list_policy_rules(), emp)
    assert res["status"] == "Pending Approval"
    assert res["requires_vp_approval"]

def test_time_machine_recalculation():
    # Verify EXP-011 initially has version 1
    exp11 = db.get_expense("EXP-011")
    assert exp11["active_decision_version"] == 1

    # Ingest a lunch expense on same date for Priya Sharma
    lunch = {
        "id": "EXP-TEST-LUNCH",
        "employee_id": "EMP-001",
        "date": "2026-10-13",
        "merchant": "Express Deli",
        "category": "Meals",
        "amount": 1400.0,
        "amount_inr": 1400.0,
        "currency": "INR",
        "eligible_amount": 1400.0,
        "excess_amount": 0.0,
        "status": "Approved",
        "active_decision_version": 1,
        "created_at": "2026-10-13T12:00:00"
    }
    db.set_expense(lunch)

    # Trigger recalculation
    recalculated = recalculate_affected_expenses(
        employee_id="EMP-001",
        target_date="2026-10-13",
        category="Meals",
        trigger_expense_id="EXP-TEST-LUNCH"
    )

    # Dinner EXP-011 must now have active_decision_version == 2, eligible_amount == 600, excess == 200
    updated_dinner = db.get_expense("EXP-011")
    assert updated_dinner["active_decision_version"] == 2
    assert updated_dinner["eligible_amount"] == 600.0
    assert updated_dinner["excess_amount"] == 200.0
    assert updated_dinner["status"] == "Partially Eligible"
    assert len(updated_dinner["decision_history"]) == 2
    print("[TESTS] All automated tests passed successfully!")

if __name__ == "__main__":
    setup_module()
    test_currency_conversion()
    test_arithmetic_validation()
    test_excluded_items_alcohol()
    test_duplicate_exact_match()
    test_client_meal_missing_fields()
    test_high_value_escalation()
    test_time_machine_recalculation()
    print("ALL TESTS PASSED 100%!")
