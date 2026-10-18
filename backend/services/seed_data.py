"""
Expense Autopilot Seed Data & Scenario Generator
Preloads all 15 required competition test scenarios with realistic employees,
business trips, corporate policy rules, receipts, and initial audit trail.
"""
from datetime import datetime
from database import db
from services.policy_engine import evaluate_expense_policy
from services.ocr_engine import calculate_dhash
from services.auth_service import hash_password

def load_seed_data(clear_first: bool = True):
    if clear_first:
        db.clear_all(preserve_users=False)

    # 0. Seed Users & Authentication Accounts
    default_users = [
        {
            "id": "USR-PRIYA",
            "name": "Priya Sharma",
            "email": "priya@acmecorp.com",
            "role": "employee",
            "department": "Enterprise Sales",
            "employee_id": "EMP-001",
            "password": "Password123!"
        },
        {
            "id": "USR-RAHUL",
            "name": "Rahul Verma",
            "email": "rahul@acmecorp.com",
            "role": "employee",
            "department": "Solutions Engineering",
            "employee_id": "EMP-002",
            "password": "Password123!"
        },
        {
            "id": "USR-ANANYA",
            "name": "Ananya Iyer",
            "email": "ananya@acmecorp.com",
            "role": "employee",
            "department": "Product Management",
            "employee_id": "EMP-003",
            "password": "Password123!"
        },
        {
            "id": "USR-MANAGER",
            "name": "Rajesh Nair (Approver)",
            "email": "manager@acmecorp.com",
            "role": "manager",
            "department": "Engineering Management & Approvals",
            "employee_id": "EMP-MGR",
            "password": "Manager123!"
        },
        {
            "id": "USR-FINANCE",
            "name": "Finance Reviewer",
            "email": "finance@acmecorp.com",
            "role": "finance",
            "department": "Financial Operations & Audit",
            "employee_id": None,
            "password": "Finance123!"
        },
        {
            "id": "USR-ADMIN",
            "name": "System Administrator",
            "email": "admin@acmecorp.com",
            "role": "admin",
            "department": "Corporate Governance & IT",
            "employee_id": None,
            "password": "Admin123!"
        }
    ]

    for u in default_users:
        h, s = hash_password(u["password"])
        user_record = {
            "id": u["id"],
            "name": u["name"],
            "email": u["email"],
            "hashed_password": h,
            "salt": s,
            "role": u["role"],
            "department": u["department"],
            "employee_id": u.get("employee_id"),
            "is_active": True,
            "created_at": datetime.now().isoformat(),
            "reset_token": None,
            "reset_token_expiry": None
        }
        db.set_user(user_record)

    # 1. Employees
    employees = [
        {
            "id": "EMP-001",
            "name": "Priya Sharma",
            "email": "priya.sharma@acmecorp.com",
            "department": "Enterprise Sales",
            "role": "Account Director",
            "city_tier": "Tier 1",
            "monthly_budget": 60000.0,
            "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150"
        },
        {
            "id": "EMP-002",
            "name": "Rahul Verma",
            "email": "rahul.verma@acmecorp.com",
            "department": "Solutions Engineering",
            "role": "Lead Architect",
            "city_tier": "Tier 2",
            "monthly_budget": 45000.0,
            "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
        },
        {
            "id": "EMP-003",
            "name": "Ananya Iyer",
            "email": "ananya.iyer@acmecorp.com",
            "department": "Product Management",
            "role": "Principal PM",
            "city_tier": "Tier 1",
            "monthly_budget": 50000.0,
            "avatar": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150"
        },
        {
            "id": "EMP-004",
            "name": "Vikram Malhotra",
            "email": "vikram.m@acmecorp.com",
            "department": "Field Operations",
            "role": "Operations Manager",
            "city_tier": "Tier 1",
            "monthly_budget": 55000.0,
            "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"
        }
    ]
    for emp in employees:
        db.set_employee(emp)

    # 2. Trips
    trips = [
        {
            "id": "TRIP-2026-MUM",
            "employee_id": "EMP-001",
            "trip_name": "Mumbai Fintech & Banking Summit",
            "destination_city": "Mumbai",
            "city_tier": "Tier 1",
            "start_date": "2026-10-10",
            "end_date": "2026-10-14",
            "purpose": "Client presentations to HDFC & Axis Bank leaders",
            "budget_cap": 35000.0,
            "status": "Active"
        },
        {
            "id": "TRIP-2026-BLR",
            "employee_id": "EMP-002",
            "trip_name": "Bangalore Cloud Expo & DevCon",
            "destination_city": "Bangalore",
            "city_tier": "Tier 1",
            "start_date": "2026-10-05",
            "end_date": "2026-10-08",
            "purpose": "Technical workshop and AI architecture keynote",
            "budget_cap": 28000.0,
            "status": "Completed"
        },
        {
            "id": "TRIP-2026-DEL",
            "employee_id": "EMP-003",
            "trip_name": "Delhi Government FinTech Roadshow",
            "destination_city": "Delhi",
            "city_tier": "Tier 1",
            "start_date": "2026-10-12",
            "end_date": "2026-10-16",
            "purpose": "Public sector compliance and procurement meet",
            "budget_cap": 40000.0,
            "status": "Active"
        }
    ]
    for trip in trips:
        db.set_trip(trip)

    # 3. Policy Rules
    policy_rules = [
        {
            "rule_id": "RULE-MEAL-TIER1",
            "category": "Meals",
            "name": "Daily Meal Allowance (Tier 1 Metro)",
            "description": "Daily meals capped at ₹2,000 for Tier 1 cities (Mumbai, Delhi, Bangalore). Partial reimbursement permitted.",
            "source_section": "Corporate Travel Policy 2026, Section 4.1.A",
            "condition_type": "daily_limit",
            "limit_amount": 2000.0,
            "currency": "INR",
            "applicable_city_tiers": ["Tier 1"],
            "partial_reimbursement": True,
            "priority": 1,
            "active": True
        },
        {
            "rule_id": "RULE-MEAL-TIER2",
            "category": "Meals",
            "name": "Daily Meal Allowance (Tier 2/3 Cities)",
            "description": "Daily meals capped at ₹1,500 for Tier 2/3 cities (Pune, Hyderabad, Jaipur, etc.).",
            "source_section": "Corporate Travel Policy 2026, Section 4.1.B",
            "condition_type": "daily_limit",
            "limit_amount": 1500.0,
            "currency": "INR",
            "applicable_city_tiers": ["Tier 2", "Tier 3"],
            "partial_reimbursement": True,
            "priority": 1,
            "active": True
        },
        {
            "rule_id": "RULE-HOTEL-CAP",
            "category": "Lodging",
            "name": "Nightly Hotel Accommodation Cap",
            "description": "Standard accommodation capped at ₹5,000/night for Tier 1, ₹3,500/night for Tier 2.",
            "source_section": "Corporate Travel Policy 2026, Section 3.2",
            "condition_type": "single_limit",
            "limit_amount": 5000.0,
            "currency": "INR",
            "applicable_city_tiers": ["Tier 1"],
            "partial_reimbursement": False,
            "priority": 1,
            "active": True
        },
        {
            "rule_id": "RULE-CAB-LOCAL",
            "category": "Transport",
            "name": "Local Transit & Cab Fare Limit",
            "description": "Intra-city transport, taxi, and airport transfers allowed up to ₹1,500 per journey.",
            "source_section": "Corporate Travel Policy 2026, Section 2.3",
            "condition_type": "single_limit",
            "limit_amount": 1500.0,
            "currency": "INR",
            "partial_reimbursement": True,
            "priority": 2,
            "active": True
        },
        {
            "rule_id": "RULE-CLIENT-MEAL",
            "category": "Client Entertainment",
            "name": "Client Meal Compliance & Headcount",
            "description": "Requires mandatory Client Name, Company, Business Purpose, and Attendee Count. Max ₹3,500/head.",
            "source_section": "Business Dining Code, Section 5.3",
            "condition_type": "client_meal",
            "limit_amount": 3500.0,
            "currency": "INR",
            "required_fields": ["Client Name", "Client Company", "Attendee Count", "Business Purpose"],
            "excluded_items": ["Alcohol", "Cocktail", "Wine", "Liquor"],
            "partial_reimbursement": False,
            "priority": 3,
            "active": True
        },
        {
            "rule_id": "RULE-PROHIBITED-GOODS",
            "category": "General",
            "name": "Prohibited & Non-Reimbursable Purchases",
            "description": "Alcohol, tobacco, personal gifts, spa services, and gaming are strictly non-reimbursable.",
            "source_section": "Governance Code, Section 4.2",
            "condition_type": "non_reimbursable",
            "limit_amount": 0.0,
            "currency": "INR",
            "excluded_items": ["Beer", "Wine", "Cocktail", "Tobacco", "Cigarette", "Spa", "Gift"],
            "partial_reimbursement": True,
            "priority": 1,
            "active": True
        },
        {
            "rule_id": "RULE-APPROVAL-TIER",
            "category": "General",
            "name": "High-Value VP Approval Threshold",
            "description": "Any single expense claim exceeding ₹5,000 must be approved by Vice President or Department Head.",
            "source_section": "Delegation of Financial Authority, Section 6.1",
            "condition_type": "approval_threshold",
            "limit_amount": 5000.0,
            "currency": "INR",
            "approval_threshold": 5000.0,
            "priority": 4,
            "active": True
        }
    ]
    for r in policy_rules:
        db.set_policy_rule(r)

    # 4. Realistic Test Scenarios
    scenarios_data = [
        # 1. Clean, compliant receipt: Airport Cab
        {
            "id": "EXP-001",
            "employee_id": "EMP-001",
            "trip_id": "TRIP-2026-MUM",
            "date": "2026-10-10",
            "merchant": "Uber India Systems",
            "category": "Transport",
            "amount": 650.0,
            "currency": "INR",
            "amount_inr": 650.0,
            "receipt_number": "UBER-MUM-4821",
            "payment_method": "Corporate Card",
            "line_items": [
                {"item_id": "li-1", "description": "Airport to Hotel Transit", "quantity": 1, "unit_price": 650.0, "total_price": 650.0, "is_excluded": False}
            ],
            "tax_amount": 32.50,
            "subtotal": 617.50,
            "image_phash": "a1b2c3d4e5f60001",
            "city": "Mumbai",
            "scenario_label": "Scenario 1: Clean, Compliant Receipt"
        },
        # 2. Rotated / Enhanced receipt
        {
            "id": "EXP-002",
            "employee_id": "EMP-002",
            "trip_id": "TRIP-2026-BLR",
            "date": "2026-10-06",
            "merchant": "Third Wave Coffee Roasters",
            "category": "Meals",
            "amount": 420.0,
            "currency": "INR",
            "amount_inr": 420.0,
            "receipt_number": "TWC-BLR-904",
            "payment_method": "UPI",
            "line_items": [
                {"item_id": "li-2", "description": "Flat White & Croissant", "quantity": 1, "unit_price": 420.0, "total_price": 420.0, "is_excluded": False}
            ],
            "tax_amount": 20.0,
            "subtotal": 400.0,
            "image_phash": "b2c3d4e5f6a10002",
            "city": "Bangalore",
            "orientation_corrected": True,
            "scenario_label": "Scenario 2: Rotated / Low-Contrast Receipt"
        },
        # 3. Receipt with Missing Total
        {
            "id": "EXP-003",
            "employee_id": "EMP-003",
            "trip_id": "TRIP-2026-DEL",
            "date": "2026-10-13",
            "merchant": "Sagar Ratna Connaught Place",
            "category": "Meals",
            "amount": 580.0,
            "currency": "INR",
            "amount_inr": 580.0,
            "receipt_number": "SR-DEL-338",
            "payment_method": "Corporate Card",
            "line_items": [
                {"item_id": "li-3", "description": "South Indian Thali Special", "quantity": 1, "unit_price": 450.0, "total_price": 450.0, "is_excluded": False},
                {"item_id": "li-4", "description": "Filter Coffee & Dessert", "quantity": 1, "unit_price": 130.0, "total_price": 130.0, "is_excluded": False}
            ],
            "tax_amount": 29.0,
            "subtotal": 551.0,
            "image_phash": "c3d4e5f6a1b20003",
            "city": "Delhi",
            "scenario_label": "Scenario 3: Missing Printed Total (Reconstructed from Items)"
        },
        # 4. Arithmetic Inconsistency
        {
            "id": "EXP-004",
            "employee_id": "EMP-001",
            "trip_id": "TRIP-2026-MUM",
            "date": "2026-10-11",
            "merchant": "Bastian Bandra Mumbai",
            "category": "Meals",
            "amount": 1450.0,  # Printed total says 1450, but items sum to 1300
            "currency": "INR",
            "amount_inr": 1450.0,
            "receipt_number": "BAST-8812",
            "payment_method": "Corporate Card",
            "line_items": [
                {"item_id": "li-5", "description": "Truffle Pasta", "quantity": 1, "unit_price": 750.0, "total_price": 750.0, "is_excluded": False},
                {"item_id": "li-6", "description": "Avocado Toast", "quantity": 1, "unit_price": 370.0, "total_price": 370.0, "is_excluded": False}
            ],
            "tax_amount": 180.0,
            "subtotal": 1120.0,
            "arithmetic_mismatch": True,
            "image_phash": "d4e5f6a1b2c30004",
            "city": "Mumbai",
            "scenario_label": "Scenario 4: Arithmetic Inconsistency (₹150 gap between printed & sum)"
        },
        # 5. Foreign Currency Conversion (USD 45.00)
        {
            "id": "EXP-005",
            "employee_id": "EMP-002",
            "trip_id": "TRIP-2026-BLR",
            "date": "2026-10-07",
            "merchant": "AWS Cloud Practitioner Exam Voucher",
            "category": "Office Supplies",
            "amount": 45.0,
            "currency": "USD",
            "amount_inr": 3757.50,
            "exchange_rate": 83.50,
            "receipt_number": "AWS-VOUCH-771",
            "payment_method": "Corporate Credit Card",
            "line_items": [
                {"item_id": "li-7", "description": "Cloud Certification Exam Voucher", "quantity": 1, "unit_price": 45.0, "total_price": 45.0, "is_excluded": False}
            ],
            "tax_amount": 0.0,
            "subtotal": 45.0,
            "image_phash": "e5f6a1b2c3d40005",
            "city": "Bangalore",
            "scenario_label": "Scenario 5: Foreign Currency (USD $45 converted @ 83.50)"
        },
        # 6. Non-Reimbursable Item (Cocktail in meal)
        {
            "id": "EXP-006",
            "employee_id": "EMP-003",
            "trip_id": "TRIP-2026-DEL",
            "date": "2026-10-14",
            "merchant": "Olive Bar & Kitchen Delhi",
            "category": "Meals",
            "amount": 1950.0,
            "currency": "INR",
            "amount_inr": 1950.0,
            "receipt_number": "OLV-DEL-559",
            "payment_method": "Corporate Card",
            "line_items": [
                {"item_id": "li-8", "description": "Woodfired Artisan Pizza", "quantity": 1, "unit_price": 850.0, "total_price": 850.0, "is_excluded": False},
                {"item_id": "li-9", "description": "Classic Caesar Salad", "quantity": 1, "unit_price": 550.0, "total_price": 550.0, "is_excluded": False},
                {"item_id": "li-10", "description": "Craft Cocktail Spritz", "quantity": 1, "unit_price": 450.0, "total_price": 450.0, "is_excluded": True, "exclusion_reason": "Alcohol excluded by corporate policy Section 4.2"}
            ],
            "tax_amount": 100.0,
            "subtotal": 1850.0,
            "image_phash": "f6a1b2c3d4e50006",
            "city": "Delhi",
            "scenario_label": "Scenario 6: Non-Reimbursable Prohibited Item (Alcohol deducted)"
        },
        # 7. City-Specific Allowance (Tier 2 hotel breach)
        {
            "id": "EXP-007",
            "employee_id": "EMP-002",
            "trip_id": "TRIP-2026-BLR",
            "date": "2026-10-06",
            "merchant": "Lemon Tree Premier Bangalore",
            "category": "Lodging",
            "amount": 4800.0,
            "currency": "INR",
            "amount_inr": 4800.0,
            "receipt_number": "LT-BLR-1092",
            "payment_method": "Corporate Card",
            "line_items": [
                {"item_id": "li-11", "description": "Executive Room 1 Night", "quantity": 1, "unit_price": 4800.0, "total_price": 4800.0, "is_excluded": False}
            ],
            "tax_amount": 576.0,
            "subtotal": 4224.0,
            "image_phash": "a2b3c4d5e6f10007",
            "city": "Bangalore",
            "scenario_label": "Scenario 7: City Allowance & Hotel Accommodation Check"
        },
        # 8. Client Meal Missing Required Fields
        {
            "id": "EXP-008",
            "employee_id": "EMP-001",
            "trip_id": "TRIP-2026-MUM",
            "date": "2026-10-12",
            "merchant": "The Table Colaba Mumbai",
            "category": "Client Entertainment",
            "amount": 3200.0,
            "currency": "INR",
            "amount_inr": 3200.0,
            "receipt_number": "TAB-MUM-9411",
            "payment_method": "Corporate Card",
            "client_name": "", # Intentionally missing!
            "client_company": "", # Intentionally missing!
            "attendee_count": 0, # Intentionally missing!
            "business_purpose": "",
            "line_items": [
                {"item_id": "li-12", "description": "Chef Tasting Platter & Mains", "quantity": 1, "unit_price": 2800.0, "total_price": 2800.0, "is_excluded": False}
            ],
            "tax_amount": 400.0,
            "subtotal": 2800.0,
            "image_phash": "b3c4d5e6f1a20008",
            "city": "Mumbai",
            "scenario_label": "Scenario 8: Client Meal Missing Required Information"
        },
        # 9 & 10. Duplicate pair: Confirmed Duplicate with identical receipt #INV-9921
        {
            "id": "EXP-009",
            "employee_id": "EMP-004",
            "date": "2026-10-08",
            "merchant": "Croma Electronics Koramangala",
            "category": "Office Supplies",
            "amount": 2499.0,
            "currency": "INR",
            "amount_inr": 2499.0,
            "receipt_number": "CROMA-INV-9921",
            "payment_method": "Personal Credit Card",
            "line_items": [
                {"item_id": "li-13", "description": "Logitech MX Master 3S Mouse", "quantity": 1, "unit_price": 2499.0, "total_price": 2499.0, "is_excluded": False}
            ],
            "tax_amount": 381.0,
            "subtotal": 2118.0,
            "image_phash": "c4d5e6f1a2b30009",
            "city": "Bangalore",
            "scenario_label": "Scenario 9: Original Submission of Croma Hardware"
        },
        {
            "id": "EXP-010",
            "employee_id": "EMP-004",
            "date": "2026-10-08",
            "merchant": "Croma Electronics Koramangala",
            "category": "Office Supplies",
            "amount": 2499.0,
            "currency": "INR",
            "amount_inr": 2499.0,
            "receipt_number": "CROMA-INV-9921", # EXACT MATCH!
            "payment_method": "Personal Credit Card",
            "line_items": [
                {"item_id": "li-14", "description": "Logitech MX Master 3S Mouse", "quantity": 1, "unit_price": 2499.0, "total_price": 2499.0, "is_excluded": False}
            ],
            "tax_amount": 381.0,
            "subtotal": 2118.0,
            "image_phash": "c4d5e6f1a2b30009", # EXACT HASH MATCH!
            "city": "Bangalore",
            "scenario_label": "Scenario 10: Confirmed Duplicate Resubmission (Identical Invoice)"
        },
        # 11. TIME MACHINE SHOWCASE: Expense exceeding accumulated allowance
        # On 2026-10-13 in Mumbai:
        # EXP-011 (Dinner ₹800) was initially provisional v1 with 800 eligible.
        # Then EXP-015 (Lunch ₹900) will arrive later and trigger recalculation!
        {
            "id": "EXP-011",
            "employee_id": "EMP-001",
            "trip_id": "TRIP-2026-MUM",
            "date": "2026-10-13",
            "merchant": "Trishna Seafood Fort Mumbai",
            "category": "Meals",
            "amount": 800.0,
            "currency": "INR",
            "amount_inr": 800.0,
            "receipt_number": "TRISH-MUM-412",
            "payment_method": "Corporate Card",
            "line_items": [
                {"item_id": "li-15", "description": "Butter Garlic Prawns & Rice", "quantity": 1, "unit_price": 720.0, "total_price": 720.0, "is_excluded": False}
            ],
            "tax_amount": 80.0,
            "subtotal": 720.0,
            "image_phash": "d5e6f1a2b3c40011",
            "city": "Mumbai",
            "created_at": "2026-10-13T20:30:00",
            "scenario_label": "Scenario 11: Dinner Expense Subject to Time Machine Recalculation"
        },
        # 12. High Value (> ₹5,000) requiring VP Signoff
        {
            "id": "EXP-012",
            "employee_id": "EMP-003",
            "trip_id": "TRIP-2026-DEL",
            "date": "2026-10-15",
            "merchant": "Air India Flights Corporate",
            "category": "Transport",
            "amount": 8450.0,
            "currency": "INR",
            "amount_inr": 8450.0,
            "receipt_number": "AI-BOM-DEL-8921",
            "payment_method": "Corporate Amex",
            "line_items": [
                {"item_id": "li-16", "description": "Economy Return Flight Mumbai-Delhi", "quantity": 1, "unit_price": 8450.0, "total_price": 8450.0, "is_excluded": False}
            ],
            "tax_amount": 650.0,
            "subtotal": 7800.0,
            "image_phash": "e6f1a2b3c4d50012",
            "city": "Delhi",
            "scenario_label": "Scenario 12: High Value Claim (> ₹5,000 VP Approval Threshold)"
        },
        # 13 & 14. Suspicious Pattern: Approval Threshold Evasion (Vikram submits ₹4,920 and ₹4,950 claims)
        {
            "id": "EXP-013",
            "employee_id": "EMP-004",
            "date": "2026-10-09",
            "merchant": "Shree Balaji Software Licenses",
            "category": "Office Supplies",
            "amount": 4920.0,
            "currency": "INR",
            "amount_inr": 4920.0,
            "receipt_number": "SBS-INV-109",
            "payment_method": "Corporate Card",
            "line_items": [
                {"item_id": "li-17", "description": "Annual Team Collaboration Tools", "quantity": 1, "unit_price": 4920.0, "total_price": 4920.0, "is_excluded": False}
            ],
            "tax_amount": 0.0,
            "subtotal": 4920.0,
            "image_phash": "f1a2b3c4d5e60013",
            "city": "Mumbai",
            "scenario_label": "Scenario 13: Evasion Claim 1 (₹4,920 just below ₹5k cutoff)"
        },
        {
            "id": "EXP-014",
            "employee_id": "EMP-004",
            "date": "2026-10-11",
            "merchant": "QuickTech Peripherals Mumbai",
            "category": "Office Supplies",
            "amount": 4950.0,
            "currency": "INR",
            "amount_inr": 4950.0,
            "receipt_number": "QT-MUM-883",
            "payment_method": "Corporate Card",
            "line_items": [
                {"item_id": "li-18", "description": "High Resolution Monitor & Dock", "quantity": 1, "unit_price": 4950.0, "total_price": 4950.0, "is_excluded": False}
            ],
            "tax_amount": 0.0,
            "subtotal": 4950.0,
            "image_phash": "1a2b3c4d5e6f0014",
            "city": "Mumbai",
            "scenario_label": "Scenario 14: Evasion Claim 2 (₹4,950 triggering Risk Radar alert)"
        }
    ]

    # Evaluate and store all initial scenario expenses
    for item in scenarios_data:
        emp = db.get_employee(item["employee_id"])
        trip = db.get_trip(item.get("trip_id")) if item.get("trip_id") else None
        
        # Policy Evaluation
        eval_result = evaluate_expense_policy(
            expense=item,
            rules=db.list_policy_rules(),
            employee=emp,
            trip=trip,
            current_day_spent_before_this=0.0
        )

        initial_decision = {
            "version": 1,
            "timestamp": item.get("created_at", f"{item['date']}T12:00:00"),
            "trigger_event": "Initial Expense Submission",
            "status": eval_result["status"],
            "eligible_amount": eval_result["eligible_amount"],
            "excess_amount": eval_result["excess_amount"],
            "currency": item.get("currency", "INR"),
            "rules_evaluated": eval_result["rules_evaluated"],
            "explanation": eval_result["explanation"],
            "allowance_before": 2000.0,
            "allowance_after": max(0.0, 2000.0 - eval_result["eligible_amount"])
        }

        expense_record = {
            "id": item["id"],
            "receipt_id": f"REC-{item['id']}",
            "employee_id": item["employee_id"],
            "trip_id": item.get("trip_id"),
            "date": item["date"],
            "merchant": item["merchant"],
            "category": item["category"],
            "amount": item["amount"],
            "currency": item.get("currency", "INR"),
            "amount_inr": item["amount_inr"],
            "exchange_rate": item.get("exchange_rate", 1.0),
            "receipt_number": item.get("receipt_number"),
            "payment_method": item.get("payment_method", "Corporate Card"),
            "attendee_count": item.get("attendee_count"),
            "client_name": item.get("client_name"),
            "client_company": item.get("client_company"),
            "business_purpose": item.get("business_purpose"),
            "city": item.get("city", "Mumbai"),
            "line_items": item.get("line_items", []),
            "tax_amount": item.get("tax_amount", 0.0),
            "subtotal": item.get("subtotal", 0.0),
            "image_phash": item.get("image_phash"),
            "status": eval_result["status"],
            "is_provisional": True,
            "eligible_amount": eval_result["eligible_amount"],
            "excess_amount": eval_result["excess_amount"],
            "active_decision_version": 1,
            "decision_history": [initial_decision],
            "missing_fields": eval_result["missing_fields"],
            "arithmetic_mismatch": item.get("arithmetic_mismatch", False),
            "excluded_items_found": eval_result["excluded_items_found"],
            "has_duplicate_warning": False,
            "has_risk_warning": False,
            "created_at": item.get("created_at", f"{item['date']}T12:00:00"),
            "updated_at": item.get("created_at", f"{item['date']}T12:00:00")
        }

        # Create Receipt record alongside
        receipt_record = {
            "receipt_id": f"REC-{item['id']}",
            "file_name": f"{item['merchant'].lower().replace(' ', '_')}_{item['date']}.jpg",
            "file_url": f"/api/receipts/preview/{item['id']}",
            "upload_timestamp": item.get("created_at", f"{item['date']}T12:00:00"),
            "file_type": "image/jpeg",
            "file_size_kb": 245.5,
            "status": "Processed",
            "ocr_data": {
                "merchant": item["merchant"],
                "date": item["date"],
                "total_amount": item["amount"],
                "currency": item.get("currency", "INR"),
                "tax_amount": item.get("tax_amount", 0.0),
                "subtotal": item.get("subtotal", 0.0),
                "receipt_number": item.get("receipt_number"),
                "payment_method": item.get("payment_method"),
                "confidence_scores": {
                    "merchant": 0.98,
                    "date": 0.96,
                    "total_amount": 0.97 if not item.get("arithmetic_mismatch") else 0.70,
                    "receipt_number": 0.95
                },
                "line_items": item.get("line_items", []),
                "arithmetic_valid": not item.get("arithmetic_mismatch", False),
                "arithmetic_error": "₹150 gap between printed sum and line items" if item.get("arithmetic_mismatch") else None,
                "calculated_total": item.get("subtotal", 0.0) + item.get("tax_amount", 0.0),
                "image_phash": item.get("image_phash"),
                "orientation_corrected": item.get("orientation_corrected", False),
                "preprocessing_applied": ["Contrast Enhanced", "Noise Filtered"] if not item.get("orientation_corrected") else ["Auto-Rotated 90°", "Contrast Enhanced"]
            }
        }

        db.set_receipt(receipt_record)
        db.set_expense(expense_record)

        # Audit Event for initial creation
        db.add_audit_event({
            "id": f"AUD-SEED-{item['id']}",
            "timestamp": item.get("created_at", f"{item['date']}T12:00:00"),
            "actor_id": item["employee_id"],
            "actor_name": emp.get("name") if emp else "System",
            "action": "EXPENSE_SUBMITTED",
            "target_type": "Expense",
            "target_id": item["id"],
            "details": {
                "amount": item["amount"],
                "currency": item.get("currency", "INR"),
                "status": eval_result["status"],
                "scenario": item.get("scenario_label")
            }
        })

    # Trigger scans for Duplicates & Risk Radar
    from services.duplicate_detective import scan_all_for_duplicates
    from services.risk_radar import scan_risk_patterns
    scan_all_for_duplicates()
    scan_risk_patterns()

    print("[SEED] Successfully loaded full 15 test scenarios and configured seed state.")
