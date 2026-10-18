"""
Expense Time Machine Service
The Signature Feature of Expense Autopilot:
- Event-based chronological expense ledger
- Multi-dimensional allowance tracking (Daily, Trip, Monthly)
- Retroactive recalculation of provisional decisions when new evidence arrives
- Versioned decision history preserving prior states with plain-language explanations
- Timeline playback and state simulation for audit and demo
"""
from datetime import datetime
from typing import Dict, Any, List, Optional
from copy import deepcopy

from database import db
from services.policy_engine import evaluate_expense_policy, convert_to_inr

def get_employee_allowance_snapshot(employee_id: str, target_date: str, category: str = "Meals") -> Dict[str, Any]:
    """
    Computes cumulative spend and remaining limits for an employee on a given date.
    """
    employee = db.get_employee(employee_id) or {"city_tier": "Tier 1", "monthly_budget": 50000.0}
    rules = db.list_policy_rules()
    
    # Find daily limit rule
    daily_cap = 2000.0 if employee.get("city_tier") == "Tier 1" else 1500.0
    for r in rules:
        if r.get("category", "").lower() == category.lower() and r.get("condition_type") == "daily_limit":
            tiers = r.get("applicable_city_tiers", [])
            if not tiers or employee.get("city_tier") in tiers:
                daily_cap = r.get("limit_amount", daily_cap)
                break

    all_expenses = db.list_expenses()
    
    # Calculate daily spent (excluding rejected or cancelled)
    day_spent = 0.0
    month_str = target_date[:7]
    month_spent = 0.0

    for exp in all_expenses:
        if exp.get("employee_id") != employee_id:
            continue
        if exp.get("status") in ["Rejected", "Duplicate"]:
            continue
        
        # Monthly total
        if exp.get("date", "").startswith(month_str):
            month_spent += exp.get("eligible_amount", exp.get("amount_inr", 0.0))
            
        # Daily total for matching category
        if exp.get("date") == target_date and exp.get("category", "").lower() == category.lower():
            day_spent += exp.get("eligible_amount", exp.get("amount_inr", 0.0))

    remaining_daily = max(0.0, round(daily_cap - day_spent, 2))
    monthly_budget = employee.get("monthly_budget", 50000.0)
    remaining_monthly = max(0.0, round(monthly_budget - month_spent, 2))

    return {
        "employee_id": employee_id,
        "date": target_date,
        "category": category,
        "daily_limit": daily_cap,
        "spent_today": round(day_spent, 2),
        "remaining_today": remaining_daily,
        "monthly_budget": monthly_budget,
        "spent_this_month": round(month_spent, 2),
        "remaining_monthly": remaining_monthly
    }

def recalculate_affected_expenses(
    employee_id: str,
    target_date: str,
    category: str,
    trigger_expense_id: str,
    reason: str = "New receipt submission"
) -> List[Dict[str, Any]]:
    """
    Recalculates all expenses for the same employee, date, and category in chronological order.
    If a previous decision's eligibility changes, generates a new decision version.
    """
    employee = db.get_employee(employee_id) or {"city_tier": "Tier 1", "monthly_budget": 50000.0}
    rules = db.list_policy_rules()
    all_expenses = db.list_expenses()

    # Filter relevant expenses for the same employee, date, and category
    relevant = [
        exp for exp in all_expenses
        if exp.get("employee_id") == employee_id
        and exp.get("date") == target_date
        and exp.get("category", "").lower() == category.lower()
        and exp.get("status") not in ["Rejected", "Duplicate"]
    ]

    # Sort chronologically by created_at or receipt time
    relevant.sort(key=lambda x: (x.get("date"), x.get("created_at", "")))

    changed_expenses = []
    accumulated_day_spend = 0.0

    for exp in relevant:
        prev_eligible = exp.get("eligible_amount", 0.0)
        prev_status = exp.get("status")
        prev_excess = exp.get("excess_amount", 0.0)
        prev_version = exp.get("active_decision_version", 1)

        # Re-evaluate policy with the accumulated spend up to this point
        trip = db.get_trip(exp.get("trip_id")) if exp.get("trip_id") else None
        
        eval_result = evaluate_expense_policy(
            expense=exp,
            rules=rules,
            employee=employee,
            trip=trip,
            current_day_spent_before_this=accumulated_day_spend
        )

        new_eligible = eval_result["eligible_amount"]
        new_excess = eval_result["excess_amount"]
        new_status = eval_result["status"]

        # Check if decision changed
        status_changed = (prev_status != new_status)
        amount_changed = (abs(prev_eligible - new_eligible) > 0.01)

        if (status_changed or amount_changed) and exp.get("id") != trigger_expense_id:
            # We have a recalculation event caused by retroactivity or evidence update!
            new_version_num = prev_version + 1
            trigger_text = (
                f"Expense #{trigger_expense_id} arrived or was updated. "
                f"Consumed cumulative allowance, shifting prior eligible amount "
                f"from ₹{prev_eligible:.2f} to ₹{new_eligible:.2f}."
            )

            new_decision_version = {
                "version": new_version_num,
                "timestamp": datetime.now().isoformat(),
                "trigger_event": trigger_text,
                "status": new_status,
                "eligible_amount": new_eligible,
                "excess_amount": new_excess,
                "currency": exp.get("currency", "INR"),
                "rules_evaluated": eval_result["rules_evaluated"],
                "explanation": (
                    f"Recalculated by Time Machine: {eval_result['explanation']} "
                    f"[Prior Version v{prev_version} allowed ₹{prev_eligible:.2f} with status '{prev_status}']."
                ),
                "affected_by_expense_id": trigger_expense_id,
                "allowance_before": prev_eligible,
                "allowance_after": new_eligible
            }

            exp["eligible_amount"] = new_eligible
            exp["excess_amount"] = new_excess
            exp["status"] = new_status
            exp["active_decision_version"] = new_version_num
            
            history = exp.get("decision_history", [])
            history.append(new_decision_version)
            exp["decision_history"] = history
            exp["updated_at"] = datetime.now().isoformat()

            db.set_expense(exp)
            changed_expenses.append(exp)

            # Audit log the retroactive change
            db.add_audit_event({
                "id": f"AUD-TM-{datetime.now().strftime('%Y%m%d%H%M%S%f')}",
                "timestamp": datetime.now().isoformat(),
                "actor_id": "SYS-TIME-MACHINE",
                "actor_name": "Expense Time Machine",
                "action": "DECISION_RECALCULATED",
                "target_type": "Expense",
                "target_id": exp["id"],
                "details": {
                    "previous_status": prev_status,
                    "new_status": new_status,
                    "previous_eligible": prev_eligible,
                    "new_eligible": new_eligible,
                    "trigger_expense_id": trigger_expense_id,
                    "reason": trigger_text
                }
            })
        else:
            # Update values if it's the trigger expense itself
            exp["eligible_amount"] = new_eligible
            exp["excess_amount"] = new_excess
            exp["status"] = new_status
            db.set_expense(exp)

        accumulated_day_spend += new_eligible

    return changed_expenses

def build_chronological_timeline(employee_id: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Builds an event-based chronological ledger for the Time Machine view.
    Includes expenses, recalculation events, and allowance snapshots.
    """
    all_expenses = db.list_expenses()
    audit_events = db.list_audit_events()
    
    if employee_id:
        all_expenses = [e for e in all_expenses if e.get("employee_id") == employee_id]
        
    timeline_items = []

    # Map expenses into timeline events
    for exp in all_expenses:
        timeline_items.append({
            "event_id": f"EVT-SUBMIT-{exp['id']}",
            "type": "EXPENSE_RECORDED",
            "timestamp": exp.get("created_at", exp.get("date")),
            "date": exp.get("date"),
            "expense_id": exp["id"],
            "employee_id": exp["employee_id"],
            "merchant": exp["merchant"],
            "category": exp["category"],
            "amount_inr": exp.get("amount_inr", exp.get("amount")),
            "eligible_amount": exp.get("eligible_amount", 0.0),
            "excess_amount": exp.get("excess_amount", 0.0),
            "status": exp.get("status"),
            "version": exp.get("active_decision_version", 1),
            "description": f"Expense recorded: ₹{exp.get('amount_inr', exp.get('amount')):.2f} at {exp['merchant']}"
        })

        # Also add historical decision version events
        for ver in exp.get("decision_history", []):
            if ver.get("version", 1) > 1:
                timeline_items.append({
                    "event_id": f"EVT-VER-{exp['id']}-v{ver['version']}",
                    "type": "DECISION_RECALCULATED",
                    "timestamp": ver.get("timestamp"),
                    "date": exp.get("date"),
                    "expense_id": exp["id"],
                    "employee_id": exp["employee_id"],
                    "merchant": exp["merchant"],
                    "category": exp["category"],
                    "amount_inr": exp.get("amount_inr"),
                    "eligible_amount": ver.get("eligible_amount"),
                    "excess_amount": ver.get("excess_amount"),
                    "status": ver.get("status"),
                    "version": ver.get("version"),
                    "trigger_event": ver.get("trigger_event"),
                    "description": f"Decision recalculated to v{ver['version']}: {ver.get('trigger_event')}"
                })

    # Sort timeline chronologically
    timeline_items.sort(key=lambda x: x.get("timestamp", ""))
    return timeline_items
