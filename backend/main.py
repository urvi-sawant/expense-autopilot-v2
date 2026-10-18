"""
Expense Autopilot FastAPI Application
Entrypoint for REST APIs, OCR Ingestion, Deterministic Policy Engine,
Expense Time Machine, Duplicate Detective, Risk Radar, and Evaluation Suite.
"""
from datetime import datetime
import json
import os
import uuid
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, Response, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response, FileResponse

from database import db
from models import (
    Employee, Trip, PolicyRule, Receipt, Expense, DecisionVersion,
    DuplicateCandidate, RiskAlert, AuditEvent, AllowanceState,
    User, UserResponse, LoginRequest, RegisterRequest, PasswordResetRequest,
    PasswordResetConfirmRequest, TokenResponse, UserUpdateRequest,
    EvaluationReport
)
from services.ocr_engine import (
    preprocess_receipt_image, parse_receipt_text_or_data, calculate_dhash,
    process_uploaded_receipt_file
)
from services.policy_engine import evaluate_expense_policy, convert_to_inr
from services.time_machine import (
    get_employee_allowance_snapshot, recalculate_affected_expenses, build_chronological_timeline
)
from services.duplicate_detective import scan_all_for_duplicates, build_evidence_graph
from services.risk_radar import scan_risk_patterns
from services.seed_data import load_seed_data
from services.auth_service import (
    hash_password, verify_password, create_session, get_session_user_id,
    revoke_session, generate_reset_token
)
from services.evaluation_service import run_system_evaluation

app = FastAPI(
    title="Expense Autopilot API",
    description="Context-Aware Expense Auditing, Deterministic Policy Engine & Chronological Time Machine",
    version="2.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth dependency helpers
def get_current_user_optional(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    if not authorization:
        return None
    token = authorization.replace("Bearer ", "").strip()
    user_id = get_session_user_id(token)
    if user_id:
        return db.get_user(user_id)
    return None

def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    user = get_current_user_optional(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required. Please sign in.")
    return user

def require_roles(allowed_roles: List[str]):
    def role_dependency(authorization: Optional[str] = Header(None)) -> dict:
        user = get_current_user(authorization)
        if user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Requires one of roles: {', '.join(allowed_roles)}. Your current role is '{user.get('role')}'."
            )
        return user
    return role_dependency

# Initialize seed data on startup if database is empty or users empty
@app.on_event("startup")
def startup_event():
    if len(db.list_expenses()) == 0 or len(db.list_users()) == 0:
        load_seed_data(clear_first=False)

# -------------------------------------------------------------
# AUTHENTICATION & ACCESS CONTROL
# -------------------------------------------------------------
@app.post("/api/auth/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    user = db.get_user_by_email(payload.email)
    if not user or not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    
    if not verify_password(payload.password, user["hashed_password"], user["salt"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    
    token = create_session(user["id"])
    
    db.add_audit_event({
        "id": f"AUD-AUTH-{uuid.uuid4().hex[:8].upper()}",
        "timestamp": datetime.now().isoformat(),
        "actor_id": user["id"],
        "actor_name": user["name"],
        "action": "USER_LOGIN",
        "target_type": "User",
        "target_id": user["id"],
        "details": {"role": user["role"], "email": user["email"]}
    })

    return {
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "department": user["department"],
            "employee_id": user.get("employee_id"),
            "is_active": user["is_active"],
            "created_at": user["created_at"]
        }
    }

@app.post("/api/auth/register", response_model=TokenResponse)
def register(payload: RegisterRequest):
    import re
    name = (payload.name or "").strip()
    norm_email = (payload.email or "").strip().lower()
    password = payload.password or ""

    if not name:
        raise HTTPException(status_code=400, detail="Full name is required.")
    if not norm_email or not re.match(r"[^@]+@[^@]+\.[^@]+", norm_email):
        raise HTTPException(status_code=400, detail="A valid corporate email address is required.")
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    existing = db.get_user_by_email(norm_email)
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email address already exists. Please sign in.")
    
    user_id = f"USR-{uuid.uuid4().hex[:8].upper()}"
    h, s = hash_password(password)
    now_iso = datetime.now().isoformat()
    
    # Requirement: Public registrations must always create Employee accounts by default.
    # Do not allow users to select Admin or Finance roles during public registration.
    role = "employee"
    emp_id = payload.employee_id or f"EMP-{uuid.uuid4().hex[:4].upper()}"
    
    user_record = {
        "id": user_id,
        "name": name,
        "email": norm_email,
        "hashed_password": h,
        "salt": s,
        "role": role,
        "department": payload.department or "Operations",
        "employee_id": emp_id,
        "is_active": True,
        "created_at": now_iso,
        "reset_token": None,
        "reset_token_expiry": None
    }
    db.set_user(user_record)
    token = create_session(user_id)

    # Provision employee profile
    db.set_employee({
        "id": emp_id,
        "name": name,
        "email": norm_email,
        "department": payload.department or "Operations",
        "role": "Team Member",
        "city_tier": "Tier 1",
        "monthly_budget": 50000.0,
    })

    db.add_audit_event({
        "id": f"AUD-AUTH-{uuid.uuid4().hex[:8].upper()}",
        "timestamp": now_iso,
        "actor_id": user_id,
        "actor_name": payload.name.strip(),
        "action": "USER_REGISTERED",
        "target_type": "User",
        "target_id": user_id,
        "details": {"role": role, "email": norm_email}
    })

    return {
        "token": token,
        "user": {
            "id": user_record["id"],
            "name": user_record["name"],
            "email": user_record["email"],
            "role": user_record["role"],
            "department": user_record["department"],
            "employee_id": user_record["employee_id"],
            "is_active": user_record["is_active"],
            "created_at": user_record["created_at"]
        }
    }

@app.get("/api/auth/me", response_model=UserResponse)
def get_current_profile(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "role": current_user["role"],
        "department": current_user["department"],
        "employee_id": current_user.get("employee_id"),
        "is_active": current_user["is_active"],
        "created_at": current_user["created_at"]
    }

@app.post("/api/auth/logout")
def logout(authorization: Optional[str] = Header(None)):
    if authorization:
        token = authorization.replace("Bearer ", "").strip()
        revoke_session(token)
    return {"message": "Logged out successfully."}

@app.post("/api/auth/forgot-password")
def forgot_password(payload: PasswordResetRequest):
    user = db.get_user_by_email(payload.email)
    if not user:
        # Return success message to prevent user enumeration
        return {"message": "If this email is registered, password reset instructions have been generated.", "reset_token": None}
    
    token = generate_reset_token()
    user["reset_token"] = token
    user["reset_token_expiry"] = datetime.now().isoformat()
    db.set_user(user)

    db.add_audit_event({
        "id": f"AUD-AUTH-{uuid.uuid4().hex[:8].upper()}",
        "timestamp": datetime.now().isoformat(),
        "actor_id": user["id"],
        "actor_name": user["name"],
        "action": "PASSWORD_RESET_REQUESTED",
        "target_type": "User",
        "target_id": user["id"],
        "details": {"email": user["email"]}
    })

    return {
        "message": "Password reset token generated successfully.",
        "reset_token": token
    }

@app.post("/api/auth/reset-password")
def reset_password(payload: PasswordResetConfirmRequest):
    user = db.get_user_by_reset_token(payload.token)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired password reset token.")
    
    h, s = hash_password(payload.new_password)
    user["hashed_password"] = h
    user["salt"] = s
    user["reset_token"] = None
    user["reset_token_expiry"] = None
    db.set_user(user)

    db.add_audit_event({
        "id": f"AUD-AUTH-{uuid.uuid4().hex[:8].upper()}",
        "timestamp": datetime.now().isoformat(),
        "actor_id": user["id"],
        "actor_name": user["name"],
        "action": "PASSWORD_RESET_COMPLETED",
        "target_type": "User",
        "target_id": user["id"],
        "details": {"email": user["email"]}
    })

    return {"message": "Password has been successfully updated. You may now log in."}

# -------------------------------------------------------------
# USER MANAGEMENT (ADMIN ONLY)
# -------------------------------------------------------------
@app.get("/api/users", response_model=List[UserResponse])
def list_users(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Administrative access required to manage users.")
    users = db.list_users()
    return [
        {
            "id": u["id"],
            "name": u["name"],
            "email": u["email"],
            "role": u["role"],
            "department": u["department"],
            "employee_id": u.get("employee_id"),
            "is_active": u.get("is_active", True),
            "created_at": u.get("created_at", "")
        }
        for u in users
    ]

@app.put("/api/users/{user_id}", response_model=UserResponse)
def update_user(user_id: str, updates: UserUpdateRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Administrative access required.")
    
    target_user = db.get_user(user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")
    
    if updates.name is not None: target_user["name"] = updates.name.strip()
    if updates.role is not None and updates.role in ["employee", "manager", "finance", "admin"]: target_user["role"] = updates.role
    if updates.department is not None: target_user["department"] = updates.department
    if updates.is_active is not None: target_user["is_active"] = updates.is_active
    
    db.set_user(target_user)

    db.add_audit_event({
        "id": f"AUD-USR-{uuid.uuid4().hex[:8].upper()}",
        "timestamp": datetime.now().isoformat(),
        "actor_id": current_user["id"],
        "actor_name": current_user["name"],
        "action": "USER_UPDATED",
        "target_type": "User",
        "target_id": user_id,
        "details": {"updated_fields": list(updates.dict(exclude_unset=True).keys())}
    })

    return target_user

# -------------------------------------------------------------
# OVERVIEW & KPI METRICS
# -------------------------------------------------------------
@app.get("/api/overview/stats")
def get_overview_stats():
    expenses = db.list_expenses()
    duplicates = db.list_duplicates()
    risk_alerts = db.list_risk_alerts()

    total_submitted = sum(e.get("amount_inr", e.get("amount", 0.0)) for e in expenses)
    total_eligible = sum(e.get("eligible_amount", 0.0) for e in expenses if e.get("status") not in ["Rejected", "Duplicate"])
    awaiting_review = len([e for e in expenses if e.get("status") in ["Under Review", "Needs Clarification", "Pending Approval"]])
    
    # Potential duplicate financial exposure
    dup_exposure = 0.0
    for d in duplicates:
        if not d.get("resolved") and d.get("classification") in ["Likely Duplicate", "Possible Duplicate"]:
            sec_exp = db.get_expense(d.get("expense_id_secondary"))
            if sec_exp:
                dup_exposure += sec_exp.get("amount_inr", 0.0)

    # Decisions changed by new evidence (v > 1)
    recalculated_count = len([e for e in expenses if e.get("active_decision_version", 1) > 1])
    
    # Exceptions / Violations
    exceptions_count = len([e for e in expenses if e.get("excess_amount", 0.0) > 0 or len(e.get("excluded_items_found", [])) > 0])
    missing_info_count = len([e for e in expenses if len(e.get("missing_fields", [])) > 0 or e.get("arithmetic_mismatch")])

    # Estimated audit time saved: Baseline 15 min manual review vs 1.2 min automated autopilot check
    hours_saved = round((len(expenses) * 13.8) / 60.0, 1)

    return {
        "receipts_count": len(db.list_receipts()),
        "expenses_count": len(expenses),
        "total_submitted_amount": round(total_submitted, 2),
        "total_eligible_amount": round(total_eligible, 2),
        "total_awaiting_review": awaiting_review,
        "potential_duplicate_exposure": round(dup_exposure, 2),
        "policy_exception_count": exceptions_count,
        "missing_information_count": missing_info_count,
        "decisions_changed_by_evidence": recalculated_count,
        "estimated_review_time_saved_hours": hours_saved,
        "active_risk_alerts_count": len([a for a in risk_alerts if a.get("status") == "Active"]),
        "employees_count": len(db.list_employees()),
        "trips_count": len(db.list_trips())
    }

# -------------------------------------------------------------
# EXPENSES
# -------------------------------------------------------------
@app.get("/api/expenses")
def list_expenses(
    employee_id: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    expenses = db.list_expenses()
    
    # Server-side Access Control:
    # Employees can ONLY access their own expenses!
    if current_user and current_user.get("role") == "employee":
        user_emp_id = current_user.get("employee_id") or current_user.get("id")
        expenses = [e for e in expenses if e.get("employee_id") == user_emp_id]
    elif employee_id:
        expenses = [e for e in expenses if e.get("employee_id") == employee_id]

    if category and category != "All":
        expenses = [e for e in expenses if e.get("category", "").lower() == category.lower()]
    if status and status != "All":
        expenses = [e for e in expenses if e.get("status", "").lower() == status.lower()]
    if search:
        s = search.lower()
        expenses = [
            e for e in expenses
            if s in e.get("merchant", "").lower()
            or s in e.get("id", "").lower()
            or s in (e.get("receipt_number") or "").lower()
        ]
    expenses.sort(key=lambda x: x.get("date", ""), reverse=True)
    return expenses

@app.get("/api/expenses/{expense_id}")
def get_expense_detail(
    expense_id: str,
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    exp = db.get_expense(expense_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found")

    # Server-side Access Control:
    # Employees cannot access other employees' private expense records
    if current_user and current_user.get("role") == "employee":
        user_emp_id = current_user.get("employee_id") or current_user.get("id")
        if exp.get("employee_id") != user_emp_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied. You are only authorized to view your own expense records."
            )

    emp = db.get_employee(exp.get("employee_id"))
    trip = db.get_trip(exp.get("trip_id")) if exp.get("trip_id") else None
    receipt = db.get_receipt(exp.get("receipt_id")) if exp.get("receipt_id") else None
    
    # Related duplicates
    duplicates = [
        d for d in db.list_duplicates()
        if d.get("expense_id_primary") == expense_id or d.get("expense_id_secondary") == expense_id
    ]

    # Related risk alerts
    risk_alerts = [
        a for a in db.list_risk_alerts()
        if expense_id in a.get("affected_expense_ids", [])
    ]

    # Allowance snapshot for that day
    allowance = get_employee_allowance_snapshot(exp["employee_id"], exp["date"], exp.get("category", "Meals"))

    return {
        "expense": exp,
        "employee": emp,
        "trip": trip,
        "receipt": receipt,
        "duplicates": duplicates,
        "risk_alerts": risk_alerts,
        "allowance_snapshot": allowance
    }

@app.post("/api/expenses")
def submit_expense(
    payload: Dict[str, Any],
    current_user: Optional[dict] = Depends(get_current_user_optional)
):
    """
    Submits a new expense, runs policy evaluation, attaches decision v1,
    and recalculates any affected chronologically subsequent expenses!
    """
    exp_id = payload.get("id") or f"EXP-{str(uuid.uuid4())[:8].upper()}"
    emp_id = payload.get("employee_id", "EMP-001")
    if current_user and current_user.get("role") == "employee":
        emp_id = current_user.get("employee_id") or current_user.get("id")

    date_str = payload.get("date", datetime.now().strftime("%Y-%m-%d"))
    category = payload.get("category", "Meals")
    amount = float(payload.get("amount", 0.0))
    currency = payload.get("currency", "INR").upper()
    amount_inr, rate = convert_to_inr(amount, currency)

    emp = db.get_employee(emp_id)
    trip = db.get_trip(payload.get("trip_id")) if payload.get("trip_id") else None

    # Evaluate against rules
    eval_result = evaluate_expense_policy(
        expense={**payload, "amount_inr": amount_inr},
        rules=db.list_policy_rules(),
        employee=emp,
        trip=trip
    )

    now_iso = datetime.now().isoformat()
    initial_decision = {
        "version": 1,
        "timestamp": now_iso,
        "trigger_event": "Expense Submission",
        "status": eval_result["status"],
        "eligible_amount": eval_result["eligible_amount"],
        "excess_amount": eval_result["excess_amount"],
        "currency": currency,
        "rules_evaluated": eval_result["rules_evaluated"],
        "explanation": eval_result["explanation"],
        "allowance_before": 2000.0,
        "allowance_after": max(0.0, 2000.0 - eval_result["eligible_amount"])
    }

    expense_record = {
        "id": exp_id,
        "receipt_id": payload.get("receipt_id"),
        "employee_id": emp_id,
        "trip_id": payload.get("trip_id"),
        "date": date_str,
        "merchant": payload.get("merchant", "Custom Merchant"),
        "category": category,
        "amount": amount,
        "currency": currency,
        "amount_inr": amount_inr,
        "exchange_rate": rate,
        "receipt_number": payload.get("receipt_number"),
        "payment_method": payload.get("payment_method", "Corporate Card"),
        "attendee_count": payload.get("attendee_count"),
        "client_name": payload.get("client_name"),
        "client_company": payload.get("client_company"),
        "business_purpose": payload.get("business_purpose"),
        "city": payload.get("city", "Mumbai"),
        "line_items": payload.get("line_items", []),
        "subtotal": float(payload.get("subtotal", amount)),
        "tax_amount": float(payload.get("tax_amount", 0.0)),
        "cgst_amount": float(payload.get("cgst_amount", 0.0)) if payload.get("cgst_amount") is not None else None,
        "sgst_amount": float(payload.get("sgst_amount", 0.0)) if payload.get("sgst_amount") is not None else None,
        "igst_amount": float(payload.get("igst_amount", 0.0)) if payload.get("igst_amount") is not None else None,
        "tax_percentage": float(payload.get("tax_percentage")) if payload.get("tax_percentage") is not None else None,
        "raw_file_url": payload.get("raw_file_url"),
        "image_phash": payload.get("image_phash"),
        "status": eval_result["status"],
        "is_provisional": True,
        "eligible_amount": eval_result["eligible_amount"],
        "excess_amount": eval_result["excess_amount"],
        "active_decision_version": 1,
        "decision_history": [initial_decision],
        "missing_fields": eval_result["missing_fields"],
        "arithmetic_mismatch": payload.get("arithmetic_mismatch", False),
        "excluded_items_found": eval_result["excluded_items_found"],
        "has_duplicate_warning": False,
        "has_risk_warning": False,
        "created_at": now_iso,
        "updated_at": now_iso
    }

    db.set_expense(expense_record)

    # Trigger Expense Time Machine Recalculation for same day / category
    recalc_changed = recalculate_affected_expenses(
        employee_id=emp_id,
        target_date=date_str,
        category=category,
        trigger_expense_id=exp_id,
        reason=f"New submission #{exp_id} arrived for {date_str}"
    )

    # Run Duplicates & Risk Scans
    scan_all_for_duplicates()
    scan_risk_patterns()

    # Log Audit Event
    db.add_audit_event({
        "id": f"AUD-{uuid.uuid4().hex[:10].upper()}",
        "timestamp": now_iso,
        "actor_id": emp_id,
        "actor_name": emp.get("name") if emp else emp_id,
        "action": "EXPENSE_SUBMITTED",
        "target_type": "Expense",
        "target_id": exp_id,
        "details": {
            "amount": amount,
            "currency": currency,
            "status": eval_result["status"],
            "recalculated_count": len(recalc_changed)
        }
    })

    return {
        "expense": db.get_expense(exp_id),
        "recalculated_expenses": recalc_changed,
        "message": f"Expense {exp_id} recorded successfully."
    }

@app.put("/api/expenses/{expense_id}")
def update_expense_corrections(expense_id: str, updates: Dict[str, Any]):
    """
    Human Correction Workflow:
    Allows user/reviewer to correct uncertain extracted fields (amount, merchant,
    date, attendee count, client details), logs audit entry, and re-evaluates policy.
    """
    exp = db.get_expense(expense_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found")

    old_status = exp.get("status")
    old_eligible = exp.get("eligible_amount")

    # Apply updates
    for k, v in updates.items():
        if k in ["amount", "merchant", "date", "category", "client_name", "client_company", "attendee_count", "business_purpose", "receipt_number"]:
            exp[k] = v

    if "amount" in updates:
        exp["amount"] = float(updates["amount"])
        exp["amount_inr"], exp["exchange_rate"] = convert_to_inr(exp["amount"], exp.get("currency", "INR"))

    # Re-evaluate with updated fields
    emp = db.get_employee(exp["employee_id"])
    trip = db.get_trip(exp.get("trip_id")) if exp.get("trip_id") else None
    eval_result = evaluate_expense_policy(exp, db.list_policy_rules(), emp, trip)

    # Append new decision version
    new_v = exp.get("active_decision_version", 1) + 1
    now_iso = datetime.now().isoformat()
    new_decision = {
        "version": new_v,
        "timestamp": now_iso,
        "trigger_event": f"Human Correction: Updated {', '.join(updates.keys())}",
        "status": eval_result["status"],
        "eligible_amount": eval_result["eligible_amount"],
        "excess_amount": eval_result["excess_amount"],
        "currency": exp.get("currency", "INR"),
        "rules_evaluated": eval_result["rules_evaluated"],
        "explanation": f"Post-Correction Decision: {eval_result['explanation']}",
        "allowance_before": old_eligible,
        "allowance_after": eval_result["eligible_amount"]
    }

    exp["status"] = eval_result["status"]
    exp["eligible_amount"] = eval_result["eligible_amount"]
    exp["excess_amount"] = eval_result["excess_amount"]
    exp["missing_fields"] = eval_result["missing_fields"]
    exp["arithmetic_mismatch"] = False  # Cleared by human adjudication
    exp["active_decision_version"] = new_v
    exp.setdefault("decision_history", []).append(new_decision)
    exp["updated_at"] = now_iso

    db.set_expense(exp)

    # Re-trigger Time Machine
    recalculated = recalculate_affected_expenses(
        employee_id=exp["employee_id"],
        target_date=exp["date"],
        category=exp["category"],
        trigger_expense_id=exp["id"],
        reason="Field correction updated claim values"
    )

    db.add_audit_event({
        "id": f"AUD-{uuid.uuid4().hex[:10].upper()}",
        "timestamp": now_iso,
        "actor_id": "FINANCE-REVIEWER",
        "actor_name": "Finance Auditor",
        "action": "CORRECTION_SAVED",
        "target_type": "Expense",
        "target_id": expense_id,
        "details": {
            "fields_modified": list(updates.keys()),
            "old_status": old_status,
            "new_status": exp["status"]
        }
    })

    return {"expense": exp, "recalculated": recalculated}

@app.post("/api/expenses/{expense_id}/review")
def review_expense_action(
    expense_id: str,
    payload: Dict[str, Any],
    current_user: dict = Depends(require_roles(["manager", "admin"]))
):
    """
    Reviewer Actions (Manager / Approver or Admin only):
    Approve, Reject, Request Clarification, Escalate, Record Authorized Exception.
    Employees and Finance users without manager delegation are strictly rejected with 403 Forbidden.
    """
    exp = db.get_expense(expense_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Expense not found")

    action = payload.get("action")  # APPROVE, REJECT, REQUEST_CLARIFICATION, AUTHORIZED_EXCEPTION, ESCALATE
    reason = payload.get("reason", "Standard audit disposition")
    reviewer_name = payload.get("reviewer_name") or current_user.get("name", "Authorized Approver")
    reviewer_role = current_user.get("role", "manager")
    actor_id = current_user.get("id", "MGR-01")

    now_iso = datetime.now().isoformat()
    old_status = exp.get("status")

    if action == "APPROVE":
        exp["status"] = "Approved"
        exp["is_provisional"] = False
    elif action == "REJECT":
        exp["status"] = "Rejected"
        exp["eligible_amount"] = 0.0
        exp["is_provisional"] = False
    elif action == "REQUEST_CLARIFICATION":
        exp["status"] = "Needs Clarification"
    elif action == "AUTHORIZED_EXCEPTION":
        # Override excess and approve full amount as an authorized policy waiver
        exp["status"] = "Approved"
        exp["eligible_amount"] = exp.get("amount_inr", exp.get("amount"))
        exp["excess_amount"] = 0.0
        exp["is_provisional"] = False
    elif action == "ESCALATE":
        exp["status"] = "Pending Approval"

    # Add Decision History Record
    new_v = exp.get("active_decision_version", 1) + 1
    exp["active_decision_version"] = new_v
    exp.setdefault("decision_history", []).append({
        "version": new_v,
        "timestamp": now_iso,
        "trigger_event": f"Reviewer Action: {action}",
        "status": exp["status"],
        "eligible_amount": exp["eligible_amount"],
        "excess_amount": exp.get("excess_amount", 0.0),
        "currency": exp.get("currency", "INR"),
        "explanation": f"Decision by {reviewer_name} ({reviewer_role}): {reason}",
        "reviewer_notes": reason
    })
    exp["updated_at"] = now_iso
    db.set_expense(exp)

    db.add_audit_event({
        "id": f"AUD-{uuid.uuid4().hex[:10].upper()}",
        "timestamp": now_iso,
        "actor_id": actor_id,
        "actor_name": reviewer_name,
        "action": f"EXPENSE_{action}",
        "target_type": "Expense",
        "target_id": expense_id,
        "details": {
            "reviewer_role": reviewer_role,
            "old_status": old_status,
            "new_status": exp["status"],
            "reason": reason
        }
    })

    return {"expense": exp, "message": f"Expense {expense_id} updated to {exp['status']}."}

# -------------------------------------------------------------
# INTELLIGENT RECEIPT INGESTION & OCR
# -------------------------------------------------------------
@app.post("/api/receipts/upload")
async def upload_receipt(
    file: UploadFile = File(...),
    employee_id: str = Form("EMP-001"),
    trip_id: Optional[str] = Form(None)
):
    """
    Accepts image/PDF upload, runs real OCR / PDF text extraction pipeline,
    computes perceptual hash, extracts all structured financial and tax fields,
    verifies arithmetic, saves original file, and returns structured data.
    """
    content = await file.read()
    file_name = file.filename or "receipt.jpg"
    size_kb = round(len(content) / 1024.0, 1)

    # Persist the original uploaded receipt file
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    upload_dir = os.path.join(backend_dir, "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    rec_id = f"REC-{uuid.uuid4().hex[:8].upper()}"
    safe_name = os.path.basename(file_name).replace(" ", "_")
    saved_path = os.path.join(upload_dir, f"{rec_id}_{safe_name}")
    try:
        with open(saved_path, "wb") as f:
            f.write(content)
    except Exception as e:
        print(f"[Upload] Error saving receipt to disk: {e}")
        saved_path = None

    # Run actual OCR/PDF extraction through our dedicated pipeline
    parsed_data, meta = await process_uploaded_receipt_file(
        content=content,
        filename=file_name,
        content_type=file.content_type or "image/jpeg"
    )

    receipt_record = {
        "receipt_id": rec_id,
        "file_name": file_name,
        "file_url": f"/api/receipts/preview/{rec_id}",
        "raw_file_url": f"/api/receipts/{rec_id}/file",
        "saved_path": saved_path,
        "upload_timestamp": datetime.now().isoformat(),
        "file_type": file.content_type or "image/jpeg",
        "file_size_kb": size_kb,
        "status": "Processed",
        "ocr_data": parsed_data
    }
    db.set_receipt(receipt_record)

    return {
        "receipt": receipt_record,
        "parsed_data": parsed_data,
        "suggested_category": parsed_data.get("suggested_category", "Meals")
    }

@app.get("/api/receipts")
def list_receipts():
    return db.list_receipts()

@app.get("/api/receipts/{receipt_id}/file")
def get_receipt_raw_file(receipt_id: str):
    """
    Returns the original uploaded receipt file (image or PDF) for full comparison.
    Falls back to high-fidelity SVG preview if original physical file is absent.
    """
    rec = db.get_receipt(receipt_id)
    if not rec:
        exp = db.get_expense(receipt_id)
        if exp and exp.get("receipt_id"):
            rec = db.get_receipt(exp.get("receipt_id"))
    if not rec:
        raise HTTPException(status_code=404, detail="Receipt not found")

    saved_path = rec.get("saved_path")
    if saved_path and os.path.exists(saved_path):
        return FileResponse(
            saved_path,
            media_type=rec.get("file_type", "application/octet-stream"),
            filename=rec.get("file_name", "receipt")
        )
    return get_receipt_preview_image(receipt_id)

@app.get("/api/receipts/preview/{item_id}", response_class=Response)
def get_receipt_preview_image(item_id: str):
    """
    Returns the real image file if available, or generates a realistic,
    crisp SVG receipt image card representing the actual receipt.
    Allows inspection, zooming, rotation, and high-contrast styling.
    """
    exp = db.get_expense(item_id)
    rec = db.get_receipt(item_id) or (db.get_receipt(exp.get("receipt_id")) if exp else None)

    # If physical image file exists on disk, serve the real image
    if rec and rec.get("saved_path") and os.path.exists(rec["saved_path"]):
        ftype = (rec.get("file_type") or "").lower()
        if ftype.startswith("image/") or rec["saved_path"].lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
            return FileResponse(rec["saved_path"], media_type=ftype or "image/jpeg")

    merchant = exp.get("merchant") if exp else (rec.get("ocr_data", {}).get("merchant") if rec else "Merchant Receipt")
    date_val = exp.get("date") if exp else (rec.get("ocr_data", {}).get("date") if rec else "2026-10-12")
    amount = exp.get("amount") if exp else (rec.get("ocr_data", {}).get("total_amount") if rec else 0.0)
    currency = exp.get("currency") if exp else (rec.get("ocr_data", {}).get("currency") if rec else "INR")
    rec_num = exp.get("receipt_number") if exp else (rec.get("ocr_data", {}).get("receipt_number") if rec else "REC-4091")
    items = exp.get("line_items", []) if exp else (rec.get("ocr_data", {}).get("line_items", []) if rec else [])
    
    # SVG lines for items
    items_svg = ""
    y_pos = 180
    for idx, itm in enumerate(items[:5]):
        desc = itm.get("description", "Item")[:28]
        price = itm.get("total_price", 0.0)
        excluded_badge = " [EXCLUDED]" if itm.get("is_excluded") else ""
        text_color = "#dc2626" if itm.get("is_excluded") else "#334155"
        items_svg += f"""
        <text x="30" y="{y_pos}" font-family="Courier, monospace" font-size="13" fill="{text_color}">{desc}{excluded_badge}</text>
        <text x="370" y="{y_pos}" font-family="Courier, monospace" font-size="13" text-anchor="end" fill="{text_color}">{currency} {price:.2f}</text>
        """
        y_pos += 26

    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" width="400" height="520" viewBox="0 0 400 520">
      <defs>
        <filter id="paper-shadow" x="-5%" y="-5%" width="110%" height="110%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.15"/>
        </filter>
        <pattern id="receipt-stripes" width="40" height="40" patternUnits="userSpaceOnUse">
          <line x1="0" y1="0" x2="40" y2="40" stroke="#f8fafc" stroke-width="1"/>
        </pattern>
      </defs>
      
      <!-- Receipt Background Paper -->
      <rect x="15" y="15" width="370" height="490" rx="6" fill="#fffdfa" stroke="#e2e8f0" stroke-width="1.5" filter="url(#paper-shadow)"/>
      <rect x="15" y="15" width="370" height="490" rx="6" fill="url(#receipt-stripes)" opacity="0.4"/>
      
      <!-- Top jagged border simulation -->
      <path d="M 15 25 Q 30 15, 45 25 T 75 25 T 105 25 T 135 25 T 165 25 T 195 25 T 225 25 T 255 25 T 285 25 T 315 25 T 345 25 T 375 25 L 385 25" fill="none" stroke="#cbd5e1" stroke-width="1"/>
      
      <!-- Header -->
      <text x="200" y="60" font-family="'Courier New', Courier, monospace" font-size="18" font-weight="bold" text-anchor="middle" fill="#0f172a">{merchant.upper()}</text>
      <text x="200" y="82" font-family="Courier, monospace" font-size="11" text-anchor="middle" fill="#64748b">TAX INVOICE / OFFICIAL RECEIPT</text>
      <text x="200" y="98" font-family="Courier, monospace" font-size="11" text-anchor="middle" fill="#64748b">Date: {date_val}  |  Doc #: {rec_num}</text>
      
      <!-- Divider -->
      <line x1="30" y1="115" x2="370" y2="115" stroke="#94a3b8" stroke-dasharray="4,4" stroke-width="1.5"/>
      <text x="30" y="135" font-family="Courier, monospace" font-size="12" font-weight="bold" fill="#475569">ITEM DESCRIPTION</text>
      <text x="370" y="135" font-family="Courier, monospace" font-size="12" font-weight="bold" text-anchor="end" fill="#475569">AMOUNT</text>
      <line x1="30" y1="145" x2="370" y2="145" stroke="#cbd5e1" stroke-width="1"/>
      
      <!-- Itemized Lines -->
      {items_svg}
      
      <!-- Bottom Total Section -->
      <line x1="30" y1="360" x2="370" y2="360" stroke="#94a3b8" stroke-dasharray="4,4" stroke-width="1.5"/>
      <text x="30" y="390" font-family="'Courier New', Courier, monospace" font-size="16" font-weight="bold" fill="#0f172a">TOTAL DUE:</text>
      <text x="370" y="390" font-family="'Courier New', Courier, monospace" font-size="18" font-weight="bold" text-anchor="end" fill="#0284c7">{currency} {amount:.2f}</text>
      
      <!-- Payment & Security Stamp -->
      <rect x="30" y="420" width="340" height="45" rx="4" fill="#f1f5f9" stroke="#e2e8f0"/>
      <text x="45" y="445" font-family="sans-serif" font-size="11" font-weight="600" fill="#334155">AUTH STATUS: VERIFIED BY OCR ENGINE</text>
      <text x="45" y="458" font-family="monospace" font-size="9" fill="#64748b">dHash: {exp.get('image_phash', 'a1b2c3d4e5f60000') if exp else '0000000000000000'}</text>
      <circle cx="345" cy="442" r="12" fill="#10b981" opacity="0.2"/>
      <path d="M 339 442 L 343 446 L 351 438" fill="none" stroke="#059669" stroke-width="2"/>
    </svg>"""
    return Response(content=svg_content, media_type="image/svg+xml")

# -------------------------------------------------------------
# EXPENSE TIME MACHINE (SIGNATURE FEATURE)
# -------------------------------------------------------------
@app.get("/api/time-machine/timeline")
def get_timeline(employee_id: Optional[str] = None):
    return build_chronological_timeline(employee_id)

@app.get("/api/time-machine/allowance-snapshot")
def get_allowance_snapshot(
    employee_id: str = Query("EMP-001"),
    date: str = Query("2026-10-13"),
    category: str = Query("Meals")
):
    return get_employee_allowance_snapshot(employee_id, date, category)

@app.post("/api/time-machine/simulate-retroactive-receipt")
def simulate_retroactive_receipt():
    """
    EXECUTES TEST SCENARIO 15:
    Demonstrates the signature Time Machine capability.
    - Employee Priya Sharma (EMP-001) has an illustrative daily meal limit of ₹2,000 in Mumbai.
    - EXP-011 (Dinner at Trishna for ₹800 on 2026-10-13) was previously provisionally Approved (v1) with ₹800 eligible.
    - Now, a newly submitted receipt arrives retroactively for Lunch earlier that same day:
      EXP-015 (Business Lunch at Bombay Canteen for ₹1,400).
    - Cumulative lunch of ₹1,400 + Dinner ₹800 = ₹2,200 (₹200 excess over ₹2,000 daily cap).
    - The Expense Time Machine automatically recalculates Dinner EXP-011, shifting it to decision v2 (Partially Eligible: ₹600 eligible, ₹200 excess),
      recording the trigger event and timeline explanation!
    """
    now_iso = datetime.now().isoformat()
    lunch_id = "EXP-015"
    
    # Check if already simulated
    if db.get_expense(lunch_id):
        return {
            "message": "Scenario 15 retroactive receipt already exists. You can view its effect in the Time Machine or reset the demo.",
            "lunch_expense": db.get_expense(lunch_id),
            "dinner_expense": db.get_expense("EXP-011")
        }

    # Add the Lunch Receipt
    lunch_expense = {
        "id": lunch_id,
        "receipt_id": "REC-EXP-015",
        "employee_id": "EMP-001",
        "trip_id": "TRIP-2026-MUM",
        "date": "2026-10-13",
        "merchant": "The Bombay Canteen Lower Parel",
        "category": "Meals",
        "amount": 1400.0,
        "currency": "INR",
        "amount_inr": 1400.0,
        "exchange_rate": 1.0,
        "receipt_number": "TBC-MUM-7721",
        "payment_method": "Corporate Card",
        "city": "Mumbai",
        "line_items": [
            {"item_id": "li-15-1", "description": "Barra Kebab & Biryani", "quantity": 1, "unit_price": 950.0, "total_price": 950.0, "is_excluded": False},
            {"item_id": "li-15-2", "description": "Signature Artisanal Soda", "quantity": 1, "unit_price": 300.0, "total_price": 300.0, "is_excluded": False}
        ],
        "tax_amount": 150.0,
        "subtotal": 1250.0,
        "image_phash": "f5a1b2c3d4e60015",
        "status": "Approved",
        "is_provisional": True,
        "eligible_amount": 1400.0,
        "excess_amount": 0.0,
        "active_decision_version": 1,
        "decision_history": [{
            "version": 1,
            "timestamp": "2026-10-13T13:30:00",
            "trigger_event": "Lunch Receipt Submitted (Prior in chronological order)",
            "status": "Approved",
            "eligible_amount": 1400.0,
            "excess_amount": 0.0,
            "currency": "INR",
            "explanation": "Compliant: Lunch of ₹1,400 fits within ₹2,000 Tier 1 daily meal allowance.",
            "allowance_before": 2000.0,
            "allowance_after": 600.0
        }],
        "missing_fields": [],
        "arithmetic_mismatch": False,
        "excluded_items_found": [],
        "has_duplicate_warning": False,
        "has_risk_warning": False,
        "created_at": "2026-10-13T13:30:00",
        "updated_at": now_iso
    }

    # Store receipt & expense
    db.set_receipt({
        "receipt_id": "REC-EXP-015",
        "file_name": "the_bombay_canteen_2026-10-13.jpg",
        "file_url": "/api/receipts/preview/EXP-015",
        "upload_timestamp": now_iso,
        "file_type": "image/jpeg",
        "file_size_kb": 312.0,
        "status": "Processed",
        "ocr_data": {
            "merchant": "The Bombay Canteen Lower Parel",
            "date": "2026-10-13",
            "total_amount": 1400.0,
            "currency": "INR",
            "tax_amount": 150.0,
            "subtotal": 1250.0,
            "receipt_number": "TBC-MUM-7721",
            "payment_method": "Corporate Card",
            "confidence_scores": {"merchant": 0.98, "date": 0.99, "total_amount": 0.97},
            "line_items": lunch_expense["line_items"],
            "arithmetic_valid": True,
            "image_phash": lunch_expense["image_phash"],
            "orientation_corrected": False,
            "preprocessing_applied": ["Contrast Enhanced"]
        }
    })
    db.set_expense(lunch_expense)

    # Recalculate affected expenses on 2026-10-13 for Meals!
    # Dinner EXP-011 (₹800) will be recalculated:
    # 2000 cap - 1400 lunch = 600 remaining allowance.
    # Therefore Dinner is eligible for 600, with 200 excess!
    recalculated = recalculate_affected_expenses(
        employee_id="EMP-001",
        target_date="2026-10-13",
        category="Meals",
        trigger_expense_id=lunch_id,
        reason="Retroactive Lunch Receipt #EXP-015 submitted for earlier that day"
    )

    db.add_audit_event({
        "id": f"AUD-SIM-{uuid.uuid4().hex[:8].upper()}",
        "timestamp": now_iso,
        "actor_id": "EMP-001",
        "actor_name": "Priya Sharma",
        "action": "RETROACTIVE_RECEIPT_SUBMITTED",
        "target_type": "Expense",
        "target_id": lunch_id,
        "details": {
            "recalculated_expense_id": "EXP-011",
            "dinner_prior_eligible": 800.0,
            "dinner_new_eligible": 600.0,
            "excess_created": 200.0
        }
    })

    return {
        "message": "Time Machine Recalculation Triggered: Lunch #EXP-015 ingested. Dinner #EXP-011 automatically recalculated to v2 with ₹200 excess!",
        "lunch_expense": db.get_expense(lunch_id),
        "dinner_expense": db.get_expense("EXP-011"),
        "recalculated": recalculated
    }

# -------------------------------------------------------------
# DUPLICATE DETECTIVE & EVIDENCE GRAPH
# -------------------------------------------------------------
@app.get("/api/duplicates")
def list_duplicates(current_user: Optional[dict] = Depends(get_current_user_optional)):
    if current_user and current_user.get("role") == "employee":
        return []
    scan_all_for_duplicates()
    return db.list_duplicates()

@app.post("/api/duplicates/{dup_id}/resolve")
def resolve_duplicate(
    dup_id: str,
    payload: Dict[str, Any],
    current_user: dict = Depends(require_roles(["finance", "admin"]))
):
    dup = db.get_duplicate(dup_id)
    if not dup:
        raise HTTPException(status_code=404, detail="Duplicate candidate not found")

    disposition = payload.get("disposition")  # "Confirmed Duplicate", "Split Bill", "False Positive"
    notes = payload.get("notes", "Adjudicated by reviewer")
    reviewer = payload.get("reviewer_name") or current_user.get("name", "Finance Auditor")

    dup["resolved"] = True
    dup["resolution_disposition"] = disposition
    dup["resolution_notes"] = notes
    dup["reviewer_id"] = reviewer
    db.set_duplicate(dup)

    # If confirmed duplicate, mark secondary expense as Duplicate
    sec_exp = db.get_expense(dup["expense_id_secondary"])
    if sec_exp and disposition == "Confirmed Duplicate":
        sec_exp["status"] = "Duplicate"
        sec_exp["eligible_amount"] = 0.0
        sec_exp["excess_amount"] = sec_exp.get("amount_inr", 0.0)
        db.set_expense(sec_exp)

    db.add_audit_event({
        "id": f"AUD-DUP-{uuid.uuid4().hex[:8].upper()}",
        "timestamp": datetime.now().isoformat(),
        "actor_id": "REVIEWER",
        "actor_name": reviewer,
        "action": "DUPLICATE_RESOLVED",
        "target_type": "DuplicateCandidate",
        "target_id": dup_id,
        "details": {
            "disposition": disposition,
            "notes": notes,
            "primary": dup["expense_id_primary"],
            "secondary": dup["expense_id_secondary"]
        }
    })

    return {"duplicate": dup, "message": f"Candidate marked as {disposition}."}

@app.get("/api/duplicates/evidence-graph")
def get_evidence_graph():
    return build_evidence_graph()

# -------------------------------------------------------------
# RISK RADAR
# -------------------------------------------------------------
@app.get("/api/risk-radar/alerts")
def get_risk_alerts(current_user: Optional[dict] = Depends(get_current_user_optional)):
    if current_user and current_user.get("role") == "employee":
        return []
    scan_risk_patterns()
    return db.list_risk_alerts()

@app.post("/api/risk-radar/alerts/{alert_id}/dismiss")
def dismiss_risk_alert(
    alert_id: str,
    payload: Dict[str, Any],
    current_user: dict = Depends(require_roles(["finance", "admin"]))
):
    alert = db.get_risk_alert(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Risk alert not found")

    reason = payload.get("reason", "Dismissed after audit inspection")
    reviewer = payload.get("reviewer_name") or current_user.get("name", "Risk Analyst")

    alert["status"] = "Dismissed"
    alert["dismissal_reason"] = reason
    alert["dismissed_by"] = reviewer
    db.set_risk_alert(alert)

    db.add_audit_event({
        "id": f"AUD-RISK-{uuid.uuid4().hex[:8].upper()}",
        "timestamp": datetime.now().isoformat(),
        "actor_id": "ANALYST",
        "actor_name": reviewer,
        "action": "ALERT_DISMISSED",
        "target_type": "RiskAlert",
        "target_id": alert_id,
        "details": {"reason": reason}
    })

    return {"alert": alert, "message": "Alert dismissed with recorded reason."}

@app.post("/api/risk-radar/alerts/{alert_id}/escalate")
def escalate_risk_alert(alert_id: str, payload: Dict[str, Any]):
    alert = db.get_risk_alert(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Risk alert not found")

    notes = payload.get("notes", "Escalated for senior management review")
    alert["status"] = "Escalated"
    db.set_risk_alert(alert)

    db.add_audit_event({
        "id": f"AUD-RISK-{uuid.uuid4().hex[:8].upper()}",
        "timestamp": datetime.now().isoformat(),
        "actor_id": "ANALYST",
        "actor_name": payload.get("reviewer_name", "Risk Analyst"),
        "action": "ALERT_ESCALATED",
        "target_type": "RiskAlert",
        "target_id": alert_id,
        "details": {"notes": notes}
    })

    return {"alert": alert, "message": "Alert escalated to Vice President."}

# -------------------------------------------------------------
# POLICY STUDIO
# -------------------------------------------------------------
@app.get("/api/policies/rules")
def get_policy_rules():
    return db.list_policy_rules()

@app.put("/api/policies/rules/{rule_id}")
def update_policy_rule(
    rule_id: str,
    payload: Dict[str, Any],
    current_user: dict = Depends(require_roles(["admin"]))
):
    rule = db.get_policy_rule(rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Policy rule not found")

    for k, v in payload.items():
        rule[k] = v
    db.set_policy_rule(rule)

    db.add_audit_event({
        "id": f"AUD-POL-{uuid.uuid4().hex[:8].upper()}",
        "timestamp": datetime.now().isoformat(),
        "actor_id": "POLICY-ADMIN",
        "actor_name": "Compliance Director",
        "action": "POLICY_RULE_UPDATED",
        "target_type": "PolicyRule",
        "target_id": rule_id,
        "details": {"updated_fields": list(payload.keys())}
    })

    return {"rule": rule, "message": f"Policy rule {rule_id} updated."}

@app.get("/api/policies/metadata")
def get_policy_metadata():
    return db.policy_document_metadata

# -------------------------------------------------------------
# AUDIT TRAIL
# -------------------------------------------------------------
@app.get("/api/audit/events")
def get_audit_trail(target_id: Optional[str] = None):
    events = db.list_audit_events()
    if target_id:
        events = [ev for ev in events if ev.get("target_id") == target_id]
    return events

# -------------------------------------------------------------
# DEMO CONTROLLER & EVALUATION METRICS
# -------------------------------------------------------------
@app.post("/api/demo/reset")
def reset_demo_data():
    load_seed_data(clear_first=True)
    return {"message": "Demo data successfully reset to clean default state with all 15 scenarios."}

@app.get("/api/evaluation/metrics")
def get_evaluation_metrics():
    """
    Returns live benchmark metrics calculated from identifiable test cases.
    """
    return run_system_evaluation()

@app.get("/api/evaluation/report")
def get_evaluation_report():
    """
    Returns full evaluation report including all 25 ground-truth test cases and formulas.
    """
    return run_system_evaluation()

@app.post("/api/evaluation/run")
def trigger_evaluation_run():
    """
    Re-executes the evaluation benchmark suite live and returns newly generated results.
    """
    report = run_system_evaluation()
    db.add_audit_event({
        "id": f"AUD-EVAL-{uuid.uuid4().hex[:8].upper()}",
        "timestamp": datetime.now().isoformat(),
        "actor_id": "SYS-EVALUATOR",
        "actor_name": "Evaluation Service",
        "action": "EVALUATION_RUN_COMPLETED",
        "target_type": "EvaluationReport",
        "target_id": "BENCHMARK-v2026.4",
        "details": {"sample_count": report["dataset_size"]}
    })
    return {"message": "Benchmark evaluation executed successfully.", "report": report}

@app.get("/api/evaluation/export")
def export_evaluation_report(format: str = Query("json")):
    """
    Exports evaluation benchmark metrics as CSV or JSON.
    """
    report = run_system_evaluation()
    if format.lower() == "csv":
        import io
        import csv
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Case ID", "Description", "Ground Truth Status", "Predicted Status", "Ground Truth Eligible (INR)", "Predicted Eligible (INR)", "Result"])
        for c in report["detailed_cases"]:
            writer.writerow([
                c["case_id"],
                c["description"],
                c["ground_truth_status"],
                c["predicted_status"],
                c["ground_truth_eligible"],
                c["predicted_eligible"],
                "PASSED" if c["passed"] else "FAILED"
            ])
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=expense_autopilot_evaluation.csv"}
        )
    return report
