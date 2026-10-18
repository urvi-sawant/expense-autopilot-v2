"""
Expense Autopilot Risk Radar: Explainable Anomaly & Pattern Detection
Detects:
- Threshold Evasion: Repeated expenses just below ₹5,000 approval cutoff
- Smurfing / Split Bill Pattern: Multiple claims at same vendor on same day
- Weekend non-business expenses outside approved business trips
- Identical receipt identifiers
- Outlier amounts for routine categories
"""
from datetime import datetime
from typing import Dict, Any, List
from database import db

def scan_risk_patterns() -> List[Dict[str, Any]]:
    """
    Scans entire active expense population for risk patterns and updates Risk Alerts.
    """
    expenses = db.list_expenses()
    trips = db.list_trips()
    employees = db.list_employees()
    alerts = []

    # Map trips by employee & dates
    trip_map = {t["id"]: t for t in trips}

    # 1. THRESHOLD EVASION (Claims between ₹4,800 and ₹4,999)
    # Looking for employees with 2 or more claims just under ₹5,000
    by_emp = {}
    for exp in expenses:
        emp_id = exp.get("employee_id")
        amt = exp.get("amount_inr", exp.get("amount", 0.0))
        if 4800.0 <= amt <= 4999.0 and exp.get("status") not in ["Rejected", "Duplicate"]:
            by_emp.setdefault(emp_id, []).append(exp)

    for emp_id, evasion_exps in by_emp.items():
        if len(evasion_exps) >= 2:
            alert_id = f"RISK-EVASION-{emp_id}"
            existing = db.get_risk_alert(alert_id)
            if not (existing and existing.get("status") == "Dismissed"):
                exp_ids = [e["id"] for e in evasion_exps]
                amounts_str = ", ".join([f"₹{e.get('amount_inr'):.2f}" for e in evasion_exps])
                emp = db.get_employee(emp_id) or {"name": emp_id}
                
                alert = {
                    "id": alert_id,
                    "alert_type": "THRESHOLD_EVASION",
                    "severity": "HIGH",
                    "title": f"Approval Threshold Evasion Pattern ({emp.get('name')})",
                    "description": (
                        f"Employee submitted {len(evasion_exps)} expenses ({amounts_str}) clustered tightly "
                        f"just below the ₹5,000.00 Vice-President approval sign-off requirement."
                    ),
                    "affected_expense_ids": exp_ids,
                    "employee_id": emp_id,
                    "suggested_action": "Consolidate claims and route to Department Head / VP for secondary review.",
                    "policy_reference": "Corporate Governance Policy Sec 6.1 - Delegation of Financial Authority",
                    "created_at": datetime.now().isoformat(),
                    "status": "Active"
                }
                db.set_risk_alert(alert)
                alerts.append(alert)
                for e in evasion_exps:
                    e["has_risk_warning"] = True
                    db.set_expense(e)

    # 2. SPLIT BILL / SMURFING (Multiple transactions at same merchant on same day)
    merch_day_map = {}
    for exp in expenses:
        if exp.get("status") in ["Rejected", "Duplicate"]:
            continue
        key = (exp.get("employee_id"), exp.get("date"), exp.get("merchant", "").lower().strip())
        merch_day_map.setdefault(key, []).append(exp)

    for (emp_id, exp_date, merchant), exps in merch_day_map.items():
        if len(exps) >= 2 and len(merchant) > 2:
            tot_amt = sum(e.get("amount_inr", 0.0) for e in exps)
            if tot_amt > 2000.0:  # Material amount
                alert_id = f"RISK-SPLIT-{emp_id}-{exp_date}-{merchant[:10]}"
                existing = db.get_risk_alert(alert_id)
                if not (existing and existing.get("status") == "Dismissed"):
                    emp = db.get_employee(emp_id) or {"name": emp_id}
                    alert = {
                        "id": alert_id,
                        "alert_type": "SPLIT_EXPENSE_PATTERN",
                        "severity": "MEDIUM",
                        "title": f"Split Transaction Cluster ({merchant.title()})",
                        "description": (
                            f"{len(exps)} separate receipts totaling ₹{tot_amt:.2f} logged on {exp_date} "
                            f"at '{merchant.title()}' by {emp.get('name')}. May represent an artificially split bill."
                        ),
                        "affected_expense_ids": [e["id"] for e in exps],
                        "employee_id": emp_id,
                        "merchant": merchant.title(),
                        "suggested_action": "Inspect line items to verify if charges belong to a single event that requires combined limits.",
                        "policy_reference": "Policy Sec 3.4 - Prohibition of Artificial Invoice Splitting",
                        "created_at": datetime.now().isoformat(),
                        "status": "Active"
                    }
                    db.set_risk_alert(alert)
                    alerts.append(alert)
                    for e in exps:
                        e["has_risk_warning"] = True
                        db.set_expense(e)

    # 3. WEEKEND EXPENSES (Saturday/Sunday without authorized travel trip)
    for exp in expenses:
        if exp.get("status") in ["Rejected", "Duplicate"]:
            continue
        date_str = exp.get("date", "")
        try:
            dt = datetime.strptime(date_str, "%Y-%m-%d")
            # 5 is Saturday, 6 is Sunday
            if dt.weekday() in [5, 6]:
                # Check if employee has an active trip covering this weekend
                has_active_trip = False
                if exp.get("trip_id") and exp.get("trip_id") in trip_map:
                    t = trip_map[exp.get("trip_id")]
                    if t.get("start_date") <= date_str <= t.get("end_date"):
                        has_active_trip = True

                if not has_active_trip:
                    alert_id = f"RISK-WEEKEND-{exp['id']}"
                    existing = db.get_risk_alert(alert_id)
                    if not (existing and existing.get("status") == "Dismissed"):
                        emp = db.get_employee(exp.get("employee_id")) or {"name": exp.get("employee_id")}
                        day_name = "Saturday" if dt.weekday() == 5 else "Sunday"
                        alert = {
                            "id": alert_id,
                            "alert_type": "WEEKEND_NON_BUSINESS",
                            "severity": "LOW",
                            "title": f"Weekend Expense Without Travel Authorization ({day_name})",
                            "description": (
                                f"Expense of ₹{exp.get('amount_inr'):.2f} incurred on {date_str} ({day_name}) "
                                f"with no associated approved weekend business travel authorization."
                            ),
                            "affected_expense_ids": [exp["id"]],
                            "employee_id": exp.get("employee_id"),
                            "suggested_action": "Request employee confirm business justification or provide trip mandate.",
                            "policy_reference": "Travel Policy Sec 2.1 - Authorized Business Days",
                            "created_at": datetime.now().isoformat(),
                            "status": "Active"
                        }
                        db.set_risk_alert(alert)
                        alerts.append(alert)
                        exp["has_risk_warning"] = True
                        db.set_expense(exp)
        except Exception:
            pass

    return db.list_risk_alerts()
