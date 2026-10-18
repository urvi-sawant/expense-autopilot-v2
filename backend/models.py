"""
Expense Autopilot Data Models
Pydantic schemas for employees, trips, policy rules, receipts, expenses,
decision versions, duplicates, risk alerts, and audit trails.
"""
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime, date

class Employee(BaseModel):
    id: str
    name: str
    email: str
    department: str
    role: str
    city_tier: str = "Tier 1"
    monthly_budget: float = 50000.0
    avatar: str = ""

class Trip(BaseModel):
    id: str
    employee_id: str
    trip_name: str
    destination_city: str
    city_tier: str = "Tier 1"
    start_date: str
    end_date: str
    purpose: str
    budget_cap: float = 30000.0
    status: str = "Active"

class PolicyRule(BaseModel):
    rule_id: str
    category: str
    name: str
    description: str
    source_section: str
    condition_type: str  # daily_limit, single_limit, client_meal, approval_threshold, non_reimbursable, receipt_required
    limit_amount: float
    currency: str = "INR"
    applicable_cities: List[str] = []
    applicable_city_tiers: List[str] = []
    applicable_roles: List[str] = []
    required_fields: List[str] = []
    excluded_items: List[str] = []
    approval_threshold: float = 5000.0
    partial_reimbursement: bool = True
    priority: int = 1
    active: bool = True

class LineItem(BaseModel):
    item_id: str
    description: str
    quantity: int = 1
    unit_price: float
    total_price: float
    category_hint: Optional[str] = None
    is_excluded: bool = False
    exclusion_reason: Optional[str] = None

class OCRResult(BaseModel):
    merchant: str
    date: str
    total_amount: float
    currency: str = "INR"
    tax_amount: float = 0.0
    subtotal: float = 0.0
    cgst_amount: Optional[float] = 0.0
    sgst_amount: Optional[float] = 0.0
    igst_amount: Optional[float] = 0.0
    tax_percentage: Optional[float] = None
    receipt_number: Optional[str] = None
    payment_method: Optional[str] = None
    suggested_category: Optional[str] = "Meals"
    confidence_scores: Dict[str, float] = {}
    line_items: List[LineItem] = []
    arithmetic_valid: bool = True
    arithmetic_error: Optional[str] = None
    calculated_total: float = 0.0
    is_reconstructed_total: bool = False
    raw_text: Optional[str] = ""
    image_phash: Optional[str] = None
    orientation_corrected: bool = False
    preprocessing_applied: List[str] = []

class Receipt(BaseModel):
    receipt_id: str
    file_name: str
    file_url: str
    raw_file_url: Optional[str] = None
    saved_path: Optional[str] = None
    processed_url: Optional[str] = None
    upload_timestamp: str
    file_type: str
    file_size_kb: float
    status: str = "Processed"  # Uploaded, Processing, Processed, Error
    ocr_data: OCRResult

class RuleEvaluationResult(BaseModel):
    rule_id: str
    rule_name: str
    rule_section: str
    passed: bool
    requires_clarification: bool = False
    requires_approval: bool = False
    limit_evaluated: Optional[float] = None
    current_spent: Optional[float] = None
    excess_detected: Optional[float] = None
    message: str
    severity: str = "INFO"  # INFO, WARNING, VIOLATION, ESCALATION

class DecisionVersion(BaseModel):
    version: int
    timestamp: str
    trigger_event: str
    status: str  # Approved, Partially Eligible, Needs Clarification, Pending Approval, Rejected, Flagged Duplicate
    eligible_amount: float
    excess_amount: float
    currency: str = "INR"
    rules_evaluated: List[RuleEvaluationResult] = []
    explanation: str
    reviewer_notes: Optional[str] = None
    allowance_before: Optional[float] = None
    allowance_after: Optional[float] = None
    affected_by_expense_id: Optional[str] = None

class Expense(BaseModel):
    id: str
    receipt_id: Optional[str] = None
    employee_id: str
    trip_id: Optional[str] = None
    date: str
    merchant: str
    category: str  # Meals, Lodging, Transport, Client Entertainment, Office Supplies, Flights
    amount: float
    currency: str = "INR"
    amount_inr: float
    exchange_rate: float = 1.0
    
    # Context / Mandatory policy requirements
    attendee_count: Optional[int] = None
    attendees: Optional[List[str]] = []
    client_name: Optional[str] = None
    client_company: Optional[str] = None
    business_purpose: Optional[str] = None
    city: Optional[str] = None
    
    # Decisions & Recalculation
    status: str  # Draft, Needs Clarification, Submitted, Under Review, Pending Approval, Approved, Partially Eligible, Rejected, Reimbursed, Duplicate
    is_provisional: bool = True
    eligible_amount: float = 0.0
    excess_amount: float = 0.0
    active_decision_version: int = 1
    decision_history: List[DecisionVersion] = []
    
    # Financial breakdown & OCR fields
    subtotal: Optional[float] = None
    tax_amount: Optional[float] = 0.0
    cgst_amount: Optional[float] = 0.0
    sgst_amount: Optional[float] = 0.0
    igst_amount: Optional[float] = 0.0
    tax_percentage: Optional[float] = None
    receipt_number: Optional[str] = None
    payment_method: Optional[str] = None
    line_items: List[LineItem] = []
    raw_file_url: Optional[str] = None
    image_phash: Optional[str] = None

    # Flags & Quality
    missing_fields: List[str] = []
    arithmetic_mismatch: bool = False
    excluded_items_found: List[str] = []
    has_duplicate_warning: bool = False
    has_risk_warning: bool = False
    
    # Timestamps
    created_at: str
    updated_at: str

class DuplicateCandidate(BaseModel):
    id: str
    expense_id_primary: str
    expense_id_secondary: str
    similarity_score: float  # 0 to 100
    match_factors: List[str]  # e.g., "Identical Receipt #", "Exact Amount & Date", "Visual pHash 98%"
    classification: str  # Likely Duplicate, Possible Duplicate, Cleared, Confirmed Duplicate
    created_at: str
    resolved: bool = False
    resolution_disposition: Optional[str] = None  # Confirmed Duplicate, Split Bill, False Positive
    resolution_notes: Optional[str] = None
    reviewer_id: Optional[str] = None

class RiskAlert(BaseModel):
    id: str
    alert_type: str  # THRESHOLD_EVASION, UNUSUAL_CLUSTER, WEEKEND_SPEND, DUPLICATE_RECEIPT_ID, OUTLIER_AMOUNT
    severity: str  # HIGH, MEDIUM, LOW
    title: str
    description: str
    affected_expense_ids: List[str] = []
    employee_id: Optional[str] = None
    merchant: Optional[str] = None
    suggested_action: str
    policy_reference: Optional[str] = None
    created_at: str
    status: str = "Active"  # Active, Dismissed, Escalated
    dismissal_reason: Optional[str] = None
    dismissed_by: Optional[str] = None

class AuditEvent(BaseModel):
    id: str
    timestamp: str
    actor_id: str
    actor_name: str
    action: str  # EXPENSE_SUBMITTED, DECISION_RECALCULATED, CORRECTION_SAVED, DUPLICATE_CONFIRMED, ALERT_DISMISSED, APPROVED, REJECTED
    target_type: str  # Expense, Receipt, DuplicateCandidate, RiskAlert, Policy
    target_id: str
    details: Dict[str, Any] = {}
    reason: Optional[str] = None

class AllowanceState(BaseModel):
    employee_id: str
    date: str
    category: str
    daily_limit: float
    spent_so_far: float
    remaining_allowance: float
    trip_spent: float
    trip_budget: float
    monthly_spent: float
    monthly_budget: float

# AUTHENTICATION & USERS
class User(BaseModel):
    id: str
    name: str
    email: str
    hashed_password: str
    salt: str
    role: str = "employee"  # employee, manager, finance, admin
    department: str = "Finance"
    employee_id: Optional[str] = None
    is_active: bool = True
    created_at: str
    reset_token: Optional[str] = None
    reset_token_expiry: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    department: str
    employee_id: Optional[str] = None
    is_active: bool
    created_at: str

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "employee"
    department: str = "Operations"
    employee_id: Optional[str] = None

class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirmRequest(BaseModel):
    token: str
    new_password: str

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    is_active: Optional[bool] = None

# EVALUATION BENCHMARK MODELS
class MetricDetail(BaseModel):
    metric_name: str
    score_percentage: float
    formula: str
    sample_count: int
    correct_predictions: int
    incorrect_predictions: int
    status: str

class EvaluationReport(BaseModel):
    timestamp: str
    dataset_name: str
    dataset_size: int
    metrics: Dict[str, MetricDetail]
    detailed_cases: List[Dict[str, Any]]
