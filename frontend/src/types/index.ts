export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  city_tier: string;
  monthly_budget: number;
  avatar: string;
}

export interface Trip {
  id: string;
  employee_id: string;
  trip_name: string;
  destination_city: string;
  city_tier: string;
  start_date: string;
  end_date: string;
  purpose: string;
  budget_cap: number;
  status: string;
}

export interface LineItem {
  item_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  is_excluded?: boolean;
  exclusion_reason?: string;
}

export interface RuleEvaluationResult {
  rule_id: string;
  rule_name: string;
  rule_section: string;
  passed: boolean;
  requires_clarification: boolean;
  requires_approval: boolean;
  limit_evaluated?: number;
  current_spent?: number;
  excess_detected?: number;
  message: string;
  severity: string;
}

export interface DecisionVersion {
  version: number;
  timestamp: string;
  trigger_event: string;
  status: string;
  eligible_amount: number;
  excess_amount: number;
  currency: string;
  rules_evaluated?: RuleEvaluationResult[];
  explanation: string;
  reviewer_notes?: string;
  allowance_before?: number;
  allowance_after?: number;
  affected_by_expense_id?: string;
}

export interface Expense {
  id: string;
  receipt_id?: string;
  employee_id: string;
  trip_id?: string;
  date: string;
  merchant: string;
  category: string;
  amount: number;
  currency: string;
  amount_inr: number;
  exchange_rate: number;
  receipt_number?: string;
  payment_method?: string;
  attendee_count?: number;
  client_name?: string;
  client_company?: string;
  business_purpose?: string;
  city?: string;
  line_items?: LineItem[];
  subtotal?: number;
  tax_amount?: number;
  cgst_amount?: number;
  sgst_amount?: number;
  igst_amount?: number;
  tax_percentage?: number;
  raw_file_url?: string;
  image_phash?: string;
  status: string;
  is_provisional: boolean;
  eligible_amount: number;
  excess_amount: number;
  active_decision_version: number;
  decision_history: DecisionVersion[];
  missing_fields: string[];
  arithmetic_mismatch: boolean;
  excluded_items_found: string[];
  has_duplicate_warning: boolean;
  has_risk_warning: boolean;
  created_at: string;
  updated_at: string;
}

export interface Receipt {
  receipt_id: string;
  file_name: string;
  file_url: string;
  raw_file_url?: string;
  upload_timestamp: string;
  file_type: string;
  file_size_kb: number;
  status: string;
  ocr_data: {
    merchant: string;
    date: string;
    total_amount: number;
    currency: string;
    subtotal: number;
    tax_amount: number;
    cgst_amount?: number;
    sgst_amount?: number;
    igst_amount?: number;
    tax_percentage?: number;
    receipt_number?: string;
    payment_method?: string;
    suggested_category?: string;
    confidence_scores: Record<string, number>;
    line_items: LineItem[];
    arithmetic_valid: boolean;
    arithmetic_error?: string;
    calculated_total: number;
    is_reconstructed_total?: boolean;
    raw_text?: string;
    image_phash?: string;
    orientation_corrected?: boolean;
    preprocessing_applied: string[];
  };
}

export interface DuplicateCandidate {
  id: string;
  expense_id_primary: string;
  expense_id_secondary: string;
  similarity_score: number;
  match_factors: string[];
  classification: string;
  created_at: string;
  resolved: boolean;
  resolution_disposition?: string;
  resolution_notes?: string;
  reviewer_id?: string;
}

export interface RiskAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  affected_expense_ids: string[];
  employee_id?: string;
  merchant?: string;
  suggested_action: string;
  policy_reference?: string;
  created_at: string;
  status: string;
  dismissal_reason?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor_id: string;
  actor_name: string;
  action: string;
  target_type: string;
  target_id: string;
  details: Record<string, any>;
  reason?: string;
}

export interface PolicyRule {
  rule_id: string;
  category: string;
  name: string;
  description: string;
  source_section: string;
  condition_type: string;
  limit_amount: number;
  currency: string;
  applicable_city_tiers: string[];
  required_fields?: string[];
  excluded_items?: string[];
  approval_threshold?: number;
  partial_reimbursement: boolean;
  priority: number;
  active: boolean;
}

export interface OverviewStats {
  receipts_count: number;
  expenses_count: number;
  total_submitted_amount: number;
  total_eligible_amount: number;
  total_awaiting_review: number;
  potential_duplicate_exposure: number;
  policy_exception_count: number;
  missing_information_count: number;
  decisions_changed_by_evidence: number;
  estimated_review_time_saved_hours: number;
  active_risk_alerts_count: number;
  employees_count: number;
  trips_count: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'manager' | 'finance' | 'admin';
  department: string;
  employee_id?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface MetricDetail {
  metric_name: string;
  score_percentage: number;
  formula: string;
  sample_count: number;
  correct_predictions: number;
  incorrect_predictions: number;
  status: string;
}

export interface BenchmarkCase {
  case_id: string;
  description: string;
  ground_truth_status: string;
  predicted_status: string;
  ground_truth_eligible: number;
  predicted_eligible: number;
  passed: boolean;
  details: string;
}

export interface EvaluationReport {
  timestamp: string;
  dataset_name: string;
  dataset_size: number;
  metrics: {
    field_extraction_accuracy: MetricDetail;
    duplicate_precision: MetricDetail;
    duplicate_recall: MetricDetail;
    policy_decision_agreement: MetricDetail;
    reimbursement_accuracy: MetricDetail;
    missing_field_detection_rate: MetricDetail;
    false_positive_rate: MetricDetail;
  };
  average_manual_review_time_saved_min: number;
  recalculation_correctness_percentage: number;
  detailed_cases: BenchmarkCase[];
}
