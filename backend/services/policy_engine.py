"""
Expense Autopilot Deterministic Policy Intelligence Engine
Evaluates expenses against structured policy rules, allowances,
attendee requirements, excluded items, and approval thresholds.
"""
from typing import Dict, Any, List, Tuple
from copy import deepcopy

CURRENCY_RATES = {
    "INR": 1.0,
    "USD": 83.50,
    "EUR": 90.20,
    "GBP": 105.40,
    "SGD": 62.00
}

def convert_to_inr(amount: float, currency: str) -> Tuple[float, float]:
    """Convert foreign amount to INR using corporate benchmark exchange rates."""
    rate = CURRENCY_RATES.get(currency.upper(), 1.0)
    return round(amount * rate, 2), rate

def evaluate_expense_policy(
    expense: Dict[str, Any],
    rules: List[Dict[str, Any]],
    employee: Dict[str, Any],
    trip: Dict[str, Any] = None,
    current_day_spent_before_this: float = 0.0,
    current_month_spent_before_this: float = 0.0,
    current_trip_spent_before_this: float = 0.0
) -> Dict[str, Any]:
    """
    Deterministically evaluates an expense against all applicable corporate policy rules.
    Returns:
      {
        "status": "Approved" | "Partially Eligible" | "Needs Clarification" | "Pending Approval" | "Rejected",
        "eligible_amount": float,
        "excess_amount": float,
        "rules_evaluated": List[dict],
        "explanation": str,
        "missing_fields": List[str],
        "excluded_items_found": List[str],
        "requires_vp_approval": bool
      }
    """
    amount_inr = expense.get("amount_inr", expense.get("amount", 0.0))
    category = expense.get("category", "General")
    city = expense.get("city") or (trip.get("destination_city") if trip else "Mumbai")
    city_tier = (trip.get("city_tier") if trip else employee.get("city_tier", "Tier 1")) or "Tier 1"

    rules_trace = []
    missing_fields = []
    excluded_items = []
    
    # 1. Currency Conversion Trace
    currency = expense.get("currency", "INR").upper()
    if currency != "INR":
        rate = CURRENCY_RATES.get(currency, 1.0)
        rules_trace.append({
            "rule_id": "RULE-CURRENCY-FX",
            "rule_name": "Benchmark Forex Conversion",
            "rule_section": "Sec 2.4 - Foreign Currencies",
            "passed": True,
            "requires_clarification": False,
            "requires_approval": False,
            "message": f"Converted {currency} {expense.get('amount'):.2f} @ benchmark rate ₹{rate:.2f}/unit to ₹{amount_inr:.2f}.",
            "severity": "INFO"
        })

    # 2. Check Line Items for Non-Reimbursable Goods (e.g. Alcohol, Tobacco)
    line_items = expense.get("line_items", [])
    excluded_cost = 0.0
    for itm in line_items:
        if itm.get("is_excluded", False):
            desc = itm.get("description", "Non-reimbursable item")
            cost = float(itm.get("total_price", 0.0))
            excluded_cost += cost
            excluded_items.append(f"{desc} (₹{cost:.2f})")
            
    if excluded_cost > 0:
        rules_trace.append({
            "rule_id": "RULE-NON-REIMBURSABLE",
            "rule_name": "Excluded Non-Reimbursable Items",
            "rule_section": "Sec 4.2 - Prohibited Purchases",
            "passed": False,
            "requires_clarification": False,
            "requires_approval": False,
            "limit_evaluated": 0.0,
            "excess_detected": excluded_cost,
            "message": f"Deducted ₹{excluded_cost:.2f} for prohibited items: {', '.join(excluded_items)}.",
            "severity": "WARNING"
        })

    # Net reimbursable claim before allowances
    claim_amount = max(0.0, round(amount_inr - excluded_cost, 2))

    # 3. Check Receipt & Arithmetic Consistency
    if expense.get("arithmetic_mismatch", False):
        rules_trace.append({
            "rule_id": "RULE-AUDIT-ARITHMETIC",
            "rule_name": "Receipt Sum Verification",
            "rule_section": "Sec 3.1 - Receipt Integrity",
            "passed": False,
            "requires_clarification": True,
            "requires_approval": False,
            "message": "Receipt arithmetic discrepancy detected between printed total and itemized breakdown.",
            "severity": "WARNING"
        })

    # 4. Client Entertainment / Meal Rules
    if category in ["Client Entertainment", "Meals"] and expense.get("client_name") or category == "Client Entertainment":
        attendee_count = expense.get("attendee_count")
        client_name = expense.get("client_name")
        client_company = expense.get("client_company")
        purpose = expense.get("business_purpose")

        client_missing = []
        if not client_name or client_name.strip() == "":
            client_missing.append("Client Name")
        if not client_company or client_company.strip() == "":
            client_missing.append("Client Company")
        if not attendee_count or attendee_count < 1:
            client_missing.append("Attendee Count")
        if not purpose or purpose.strip() == "":
            client_missing.append("Business Purpose")

        if client_missing:
            missing_fields.extend(client_missing)
            rules_trace.append({
                "rule_id": "RULE-CLIENT-DINING-MANDATORY",
                "rule_name": "Client Meal Documentation",
                "rule_section": "Sec 5.3 - Business Dining",
                "passed": False,
                "requires_clarification": True,
                "requires_approval": False,
                "message": f"Missing mandatory client meal requirements: {', '.join(client_missing)}.",
                "severity": "WARNING"
            })
        else:
            per_head = round(claim_amount / max(1, attendee_count), 2)
            per_head_limit = 3500.0
            passed = per_head <= per_head_limit
            rules_trace.append({
                "rule_id": "RULE-CLIENT-PER-HEAD",
                "rule_name": "Client Meal Per-Head Cap",
                "rule_section": "Sec 5.3 - Business Dining",
                "passed": passed,
                "requires_clarification": False,
                "requires_approval": not passed,
                "limit_evaluated": per_head_limit,
                "current_spent": per_head,
                "excess_detected": max(0.0, per_head - per_head_limit) * attendee_count if not passed else 0.0,
                "message": f"Client meal per head is ₹{per_head:.2f} for {attendee_count} attendees (Limit: ₹{per_head_limit:.2f}/head).",
                "severity": "INFO" if passed else "WARNING"
            })

    # 5. Category Daily / Single Limit & Cumulative Allowance Checks
    applicable_rule = None
    daily_cap = None
    for r in rules:
        if not r.get("active", True):
            continue
        if r.get("category", "").lower() == category.lower():
            tiers = r.get("applicable_city_tiers", [])
            if not tiers or city_tier in tiers:
                applicable_rule = r
                break

    eligible_amount = claim_amount
    excess_amount = round(amount_inr - eligible_amount, 2)
    daily_limit_breached = False

    if applicable_rule:
        limit_amt = applicable_rule.get("limit_amount", 0.0)
        cond_type = applicable_rule.get("condition_type", "daily_limit")
        
        if cond_type == "daily_limit":
            daily_cap = limit_amt
            remaining_today = max(0.0, round(daily_cap - current_day_spent_before_this, 2))
            
            if claim_amount <= remaining_today:
                eligible_amount = claim_amount
                excess_amount = round(amount_inr - eligible_amount, 2)
                rules_trace.append({
                    "rule_id": applicable_rule.get("rule_id", "RULE-DAILY-LIMIT"),
                    "rule_name": applicable_rule.get("name", "Daily Allowance"),
                    "rule_section": applicable_rule.get("source_section", "Policy"),
                    "passed": True,
                    "requires_clarification": False,
                    "requires_approval": False,
                    "limit_evaluated": daily_cap,
                    "current_spent": current_day_spent_before_this + claim_amount,
                    "excess_detected": 0.0,
                    "message": f"Expense of ₹{claim_amount:.2f} fits within remaining {city_tier} daily allowance of ₹{remaining_today:.2f} (Daily Cap: ₹{daily_cap:.2f}).",
                    "severity": "INFO"
                })
            else:
                # Excess over remaining daily allowance
                eligible_amount = remaining_today
                excess_amount = round(amount_inr - eligible_amount, 2)
                daily_limit_breached = True
                allow_partial = applicable_rule.get("partial_reimbursement", True)
                
                rules_trace.append({
                    "rule_id": applicable_rule.get("rule_id", "RULE-DAILY-LIMIT"),
                    "rule_name": applicable_rule.get("name", "Daily Allowance"),
                    "rule_section": applicable_rule.get("source_section", "Policy"),
                    "passed": False,
                    "requires_clarification": False,
                    "requires_approval": True,
                    "limit_evaluated": daily_cap,
                    "current_spent": current_day_spent_before_this + claim_amount,
                    "excess_detected": round(claim_amount - remaining_today, 2),
                    "message": (
                        f"Cumulative spend today exceeds {city_tier} daily limit of ₹{daily_cap:.2f}. "
                        f"Spent before this: ₹{current_day_spent_before_this:.2f}. "
                        f"Remaining allowance: ₹{remaining_today:.2f}. "
                        f"Excess: ₹{claim_amount - remaining_today:.2f}."
                    ),
                    "severity": "WARNING"
                })
        elif cond_type == "single_limit":
            if claim_amount <= limit_amt:
                eligible_amount = claim_amount
                excess_amount = round(amount_inr - eligible_amount, 2)
                rules_trace.append({
                    "rule_id": applicable_rule.get("rule_id"),
                    "rule_name": applicable_rule.get("name"),
                    "rule_section": applicable_rule.get("source_section"),
                    "passed": True,
                    "requires_clarification": False,
                    "requires_approval": False,
                    "limit_evaluated": limit_amt,
                    "current_spent": claim_amount,
                    "excess_detected": 0.0,
                    "message": f"Expense of ₹{claim_amount:.2f} is within single-transaction limit of ₹{limit_amt:.2f}.",
                    "severity": "INFO"
                })
            else:
                eligible_amount = limit_amt
                excess_amount = round(amount_inr - limit_amt, 2)
                rules_trace.append({
                    "rule_id": applicable_rule.get("rule_id"),
                    "rule_name": applicable_rule.get("name"),
                    "rule_section": applicable_rule.get("source_section"),
                    "passed": False,
                    "requires_clarification": False,
                    "requires_approval": True,
                    "limit_evaluated": limit_amt,
                    "current_spent": claim_amount,
                    "excess_detected": round(claim_amount - limit_amt, 2),
                    "message": f"Expense exceeds single-transaction limit of ₹{limit_amt:.2f} by ₹{claim_amount - limit_amt:.2f}.",
                    "severity": "WARNING"
                })

    # 6. High Value Approval Threshold (> ₹5,000)
    requires_vp = False
    if amount_inr > 5000.0:
        requires_vp = True
        rules_trace.append({
            "rule_id": "RULE-APPROVAL-HIGH-VALUE",
            "rule_name": "Executive Sign-Off Threshold",
            "rule_section": "Sec 6.1 - Governance & Delegation",
            "passed": False,
            "requires_clarification": False,
            "requires_approval": True,
            "limit_evaluated": 5000.0,
            "current_spent": amount_inr,
            "excess_detected": round(amount_inr - 5000.0, 2),
            "message": f"Claim amount ₹{amount_inr:.2f} exceeds standard manager threshold (₹5,000.00). Requires VP/Director sign-off.",
            "severity": "ESCALATION"
        })

    # 7. Trip Budget Check
    if trip and trip.get("budget_cap"):
        trip_cap = trip.get("budget_cap")
        if (current_trip_spent_before_this + eligible_amount) > trip_cap:
            rules_trace.append({
                "rule_id": "RULE-TRIP-CAP",
                "rule_name": "Trip Cumulative Budget Cap",
                "rule_section": "Sec 2.2 - Business Travel",
                "passed": False,
                "requires_clarification": False,
                "requires_approval": True,
                "limit_evaluated": trip_cap,
                "current_spent": current_trip_spent_before_this + eligible_amount,
                "excess_detected": round((current_trip_spent_before_this + eligible_amount) - trip_cap, 2),
                "message": f"Trip total would reach ₹{current_trip_spent_before_this + eligible_amount:.2f}, exceeding trip budget ₹{trip_cap:.2f}.",
                "severity": "WARNING"
            })

    # Determine Final Status & Formulate Plain-Language Explanation
    if len(missing_fields) > 0 or expense.get("arithmetic_mismatch", False):
        status = "Needs Clarification"
        explanation = (
            f"Needs Clarification: Mandatory documentation or verification required. "
            f"Missing fields: {', '.join(missing_fields) if missing_fields else 'Arithmetic resolution'}. "
            f"Reimbursement cannot be finalized until employee clarifies or reviewer grants an exception."
        )
    elif requires_vp:
        status = "Pending Approval"
        explanation = (
            f"Pending Approval: Claim of ₹{amount_inr:.2f} exceeds standard ₹5,000 approval limit. "
            f"Routed to Vice President / Department Head for authorized review."
        )
    elif daily_limit_breached:
        if eligible_amount > 0:
            status = "Partially Eligible"
            explanation = (
                f"Partially Eligible: Daily limit of ₹{daily_cap:.2f} was partially consumed by prior expenses. "
                f"₹{eligible_amount:.2f} is eligible for reimbursement, while ₹{excess_amount:.2f} is in excess of policy allowance."
            )
        else:
            status = "Rejected"
            explanation = (
                f"Exceeded Allowance: Daily allowance of ₹{daily_cap:.2f} is fully exhausted for this date. "
                f"Claim of ₹{amount_inr:.2f} cannot be reimbursed under standard policy."
            )
    elif excluded_cost > 0 and eligible_amount > 0:
        status = "Partially Eligible"
        explanation = (
            f"Partially Eligible: ₹{eligible_amount:.2f} approved for reimbursement. "
            f"₹{excluded_cost:.2f} deducted for prohibited items ({', '.join(excluded_items)})."
        )
    else:
        status = "Approved"
        explanation = f"Compliant: Fully conforms to corporate policy for {category} ({city_tier}). Total ₹{eligible_amount:.2f} eligible."

    return {
        "status": status,
        "eligible_amount": eligible_amount,
        "excess_amount": excess_amount,
        "rules_evaluated": rules_trace,
        "explanation": explanation,
        "missing_fields": missing_fields,
        "excluded_items_found": excluded_items,
        "requires_vp_approval": requires_vp,
        "claim_amount": claim_amount,
        "excluded_cost": excluded_cost
    }
