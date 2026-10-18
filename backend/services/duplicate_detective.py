"""
Expense Autopilot Duplicate Detective & Evidence Graph Service
Features:
- Multi-factor similarity calculation (pHash, merchant, amount, date, receipt_no, items)
- Calibrated confidence scoring (Likely Duplicate vs Possible Duplicate)
- Interactive Evidence Graph generation (Employees, Trips, Merchants, Receipts, Expenses)
- Resolution workflows: Confirm Duplicate, Mark Split Bill, Dismiss False Positive
"""
import re
from typing import Dict, Any, List, Tuple
from database import db
from services.ocr_engine import hamming_distance

def normalize_text(text: str) -> str:
    """Normalize string for fuzzy comparison."""
    if not text:
        return ""
    return re.sub(r'[^a-z0-9]', '', text.lower())

def calculate_jaccard_similarity(list1: List[str], list2: List[str]) -> float:
    """Calculate Jaccard similarity between two sets of line item descriptions."""
    if not list1 or not list2:
        return 0.0
    set1 = set([normalize_text(x) for x in list1 if len(x) > 2])
    set2 = set([normalize_text(x) for x in list2 if len(x) > 2])
    if not set1 or not set2:
        return 0.0
    intersection = len(set1.intersection(set2))
    union = len(set1.union(set2))
    return float(intersection) / float(union) if union > 0 else 0.0

def evaluate_duplicate_candidate(exp1: Dict[str, Any], exp2: Dict[str, Any]) -> Tuple[float, List[str], str]:
    """
    Computes a multi-factor similarity score (0 to 100%) and matching reasons.
    """
    factors = []
    score = 0.0

    # 1. Receipt Number Match (definitive if both present)
    rec1 = (exp1.get("receipt_number") or "").strip()
    rec2 = (exp2.get("receipt_number") or "").strip()
    if rec1 and rec2 and normalize_text(rec1) == normalize_text(rec2):
        score += 45.0
        factors.append(f"Identical Receipt #{rec1}")

    # 2. Perceptual Image Hash Match (dHash)
    hash1 = exp1.get("image_phash")
    hash2 = exp2.get("image_phash")
    if hash1 and hash2 and len(hash1) == len(hash2):
        dist = hamming_distance(hash1, hash2)
        if dist <= 3:
            score += 40.0
            factors.append(f"Perceptual Image Hash match (Hamming distance {dist}/64 - 95%+ visual match)")
        elif dist <= 8:
            score += 25.0
            factors.append(f"Similar Image structure (Hamming distance {dist}/64)")

    # 3. Exact Amount & Currency Match
    amt1 = float(exp1.get("amount", 0.0))
    amt2 = float(exp2.get("amount", 0.0))
    curr1 = exp1.get("currency", "INR")
    curr2 = exp2.get("currency", "INR")
    
    if curr1 == curr2 and abs(amt1 - amt2) < 0.05 and amt1 > 0:
        score += 25.0
        factors.append(f"Exact Amount Match ({curr1} {amt1:.2f})")
    elif curr1 == curr2 and abs(amt1 - amt2) < 5.0 and amt1 > 0:
        score += 10.0
        factors.append(f"Near Amount Match (Within ₹5.00)")

    # 4. Merchant Match
    merch1 = normalize_text(exp1.get("merchant", ""))
    merch2 = normalize_text(exp2.get("merchant", ""))
    if merch1 and merch2:
        if merch1 == merch2:
            score += 20.0
            factors.append(f"Exact Merchant Name ('{exp1.get('merchant')}')")
        elif merch1 in merch2 or merch2 in merch1:
            score += 12.0
            factors.append(f"Fuzzy Merchant Match ('{exp1.get('merchant')}' ~ '{exp2.get('merchant')}')")

    # 5. Transaction Date Match
    date1 = exp1.get("date", "")
    date2 = exp2.get("date", "")
    if date1 and date2 and date1 == date2:
        score += 15.0
        factors.append(f"Identical Transaction Date ({date1})")

    # 6. Line Item Similarity
    items1 = [i.get("description", "") for i in exp1.get("line_items", [])]
    items2 = [i.get("description", "") for i in exp2.get("line_items", [])]
    if items1 and items2:
        jaccard = calculate_jaccard_similarity(items1, items2)
        if jaccard > 0.6:
            score += 15.0
            factors.append(f"High Line Item Overlap ({int(jaccard*100)}% items match)")

    # Clamp score
    final_score = min(100.0, round(score, 1))

    if final_score >= 80.0 or (rec1 and rec2 and normalize_text(rec1) == normalize_text(rec2)):
        classification = "Likely Duplicate"
    elif final_score >= 50.0:
        classification = "Possible Duplicate"
    else:
        classification = "Insufficient Evidence"

    return final_score, factors, classification

def scan_all_for_duplicates() -> List[Dict[str, Any]]:
    """
    Scans the database and generates or refreshes duplicate candidates.
    """
    expenses = db.list_expenses()
    candidates = []

    for i in range(len(expenses)):
        for j in range(i + 1, len(expenses)):
            e1 = expenses[i]
            e2 = expenses[j]
            score, factors, classification = evaluate_duplicate_candidate(e1, e2)

            if classification in ["Likely Duplicate", "Possible Duplicate"]:
                cand_id = f"DUP-{e1['id']}-{e2['id']}"
                existing = db.get_duplicate(cand_id)
                
                # Preserve resolved status if previously reviewed
                resolved = existing.get("resolved", False) if existing else False
                resolution_disp = existing.get("resolution_disposition") if existing else None
                notes = existing.get("resolution_notes") if existing else None

                cand = {
                    "id": cand_id,
                    "expense_id_primary": e1["id"],
                    "expense_id_secondary": e2["id"],
                    "similarity_score": score,
                    "match_factors": factors,
                    "classification": resolution_disp if resolved else classification,
                    "created_at": e1.get("created_at", ""),
                    "resolved": resolved,
                    "resolution_disposition": resolution_disp,
                    "resolution_notes": notes
                }
                db.set_duplicate(cand)
                candidates.append(cand)

                # Set flag on expenses
                if not resolved:
                    e1["has_duplicate_warning"] = True
                    e2["has_duplicate_warning"] = True
                    db.set_expense(e1)
                    db.set_expense(e2)

    return candidates

def build_evidence_graph() -> Dict[str, Any]:
    """
    Constructs an interactive Node-Link graph connecting:
    Employees, Trips, Receipts, Expenses, and Duplicates.
    """
    employees = db.list_employees()
    trips = db.list_trips()
    expenses = db.list_expenses()
    duplicates = db.list_duplicates()

    nodes = []
    links = []
    node_ids = set()

    # Add Employee Nodes
    for emp in employees:
        n_id = f"emp_{emp['id']}"
        nodes.append({
            "id": n_id,
            "label": emp["name"],
            "type": "Employee",
            "group": 1,
            "details": f"{emp['department']} • {emp['role']}"
        })
        node_ids.add(n_id)

    # Add Trip Nodes
    for trip in trips:
        n_id = f"trip_{trip['id']}"
        nodes.append({
            "id": n_id,
            "label": trip["trip_name"],
            "type": "Trip",
            "group": 2,
            "details": f"{trip['destination_city']} ({trip['city_tier']})"
        })
        node_ids.add(n_id)

        # Link Trip to Employee
        emp_node = f"emp_{trip['employee_id']}"
        if emp_node in node_ids:
            links.append({
                "source": emp_node,
                "target": n_id,
                "relationship": "travelled_on",
                "label": "Business Trip"
            })

    # Add Expense & Merchant Nodes
    merchants_added = set()
    for exp in expenses:
        exp_id = f"exp_{exp['id']}"
        nodes.append({
            "id": exp_id,
            "label": f"{exp['merchant']} (₹{exp.get('amount_inr', exp.get('amount')):.0f})",
            "type": "Expense",
            "group": 3,
            "status": exp.get("status"),
            "details": f"{exp['category']} • {exp['date']} • {exp['status']}"
        })
        node_ids.add(exp_id)

        # Link Expense to Employee
        emp_node = f"emp_{exp['employee_id']}"
        if emp_node in node_ids:
            links.append({
                "source": emp_node,
                "target": exp_id,
                "relationship": "submitted_by",
                "label": "Submitted By"
            })

        # Link Expense to Trip if applicable
        if exp.get("trip_id"):
            trip_node = f"trip_{exp['trip_id']}"
            if trip_node in node_ids:
                links.append({
                    "source": trip_node,
                    "target": exp_id,
                    "relationship": "expense_in_trip",
                    "label": "Trip Expense"
                })

        # Merchant Node
        m_name = exp.get("merchant", "").strip()
        if m_name and m_name not in merchants_added:
            merchants_added.add(m_name)
            m_id = f"merch_{normalize_text(m_name)}"
            if m_id not in node_ids:
                nodes.append({
                    "id": m_id,
                    "label": m_name,
                    "type": "Merchant",
                    "group": 4,
                    "details": f"Vendor: {m_name}"
                })
                node_ids.add(m_id)
            links.append({
                "source": exp_id,
                "target": m_id,
                "relationship": "paid_to_vendor",
                "label": "Vendor"
            })

    # Add Duplicate Conflict Links
    for dup in duplicates:
        e1_node = f"exp_{dup['expense_id_primary']}"
        e2_node = f"exp_{dup['expense_id_secondary']}"
        if e1_node in node_ids and e2_node in node_ids:
            links.append({
                "source": e1_node,
                "target": e2_node,
                "relationship": "duplicate_candidate",
                "label": f"{dup['classification']} ({dup['similarity_score']}%)",
                "score": dup["similarity_score"],
                "is_alert": True
            })

    return {"nodes": nodes, "links": links}
