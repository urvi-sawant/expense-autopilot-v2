import React, { useState } from 'react';
import {
  CheckCircle2, AlertTriangle, ShieldCheck, UserCheck, Eye,
  ArrowRight, XCircle, ShieldAlert, MessageSquare, AlertCircle,
  FileText, ExternalLink, HelpCircle
} from 'lucide-react';
import { Expense } from '../types';
import { useAuth } from '../context/AuthContext';

interface ApprovalsPageProps {
  expenses: Expense[];
  onSelectExpense: (exp: Expense) => void;
  onReviewAction: (expenseId: string, action: string, reason: string) => Promise<void>;
}

export const ApprovalsPage: React.FC<ApprovalsPageProps> = ({
  expenses,
  onSelectExpense,
  onReviewAction
}) => {
  const { user } = useAuth();
  const [actionModal, setActionModal] = useState<{
    expenseId: string;
    action: 'APPROVE' | 'REJECT' | 'REQUEST_CLARIFICATION' | 'AUTHORIZED_EXCEPTION';
    title: string;
    merchant: string;
    amount: number;
    defaultReason: string;
  } | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isEmployee = user?.role === 'employee';
  const isFinance = user?.role === 'finance';
  const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'admin';

  // If an Employee opens Approvals
  if (isEmployee) {
    return (
      <div style={{
        maxWidth: 700,
        margin: '60px auto',
        padding: 32,
        background: '#ffffff',
        border: '1px solid var(--rose-border)',
        borderRadius: 14,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        boxShadow: 'var(--card-shadow)'
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 99,
          background: 'var(--rose-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--rose-text)'
        }}>
          <ShieldAlert size={30} />
        </div>
        <h2 style={{ fontSize: 20, color: 'var(--text-navy-primary)', fontWeight: 800 }}>
          Access Denied: Approver Role Required
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-navy-secondary)', lineHeight: 1.6 }}>
          Employees are strictly prohibited from approving or rejecting expense claims. Your corporate role is <strong>Employee ({user?.name})</strong>. You can file claims, inspect extracted receipt details, and track approval status in <strong>My Expenses</strong>.
        </p>
      </div>
    );
  }

  const pendingApprovals = expenses.filter(
    (e) => e.status === 'Pending Approval' || e.status === 'Under Review' || e.status === 'Needs Clarification' || e.amount_inr > 5000 || e.excess_amount > 0
  );

  const handleOpenActionModal = (
    expense: Expense,
    action: 'APPROVE' | 'REJECT' | 'REQUEST_CLARIFICATION' | 'AUTHORIZED_EXCEPTION'
  ) => {
    setActionError(null);
    let title = 'Approve Claim';
    let defaultReason = 'Approved by manager review.';
    if (action === 'REJECT') {
      title = 'Reject Claim';
      defaultReason = 'Non-compliant with corporate expense limit.';
    } else if (action === 'REQUEST_CLARIFICATION') {
      title = 'Request Clarification from Employee';
      defaultReason = 'Please provide mandatory attendee list and business agenda.';
    } else if (action === 'AUTHORIZED_EXCEPTION') {
      title = 'Authorize Policy Exception Waiver';
      defaultReason = 'Authorized exception granted for strategic client engagement.';
    }

    setActionModal({
      expenseId: expense.id,
      action,
      title,
      merchant: expense.merchant,
      amount: expense.amount_inr,
      defaultReason
    });
    setReasonText(defaultReason);
  };

  const handleConfirmAction = async () => {
    if (!actionModal) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await onReviewAction(actionModal.expenseId, actionModal.action, reasonText);
      setActionModal(null);
    } catch (err: any) {
      setActionError(err.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        background: 'linear-gradient(135deg, rgba(237, 233, 254, 0.7) 0%, rgba(254, 243, 199, 0.6) 100%)',
        border: '1px solid var(--border-purple-thin)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <ShieldCheck size={16} color="#7c3aed" />
          <span style={{ fontSize: 13, color: '#6d28d9', fontWeight: 700 }}>
            Executive Delegation & Sign-Off Portal
          </span>
        </div>
        <h2 style={{ fontSize: 24, color: 'var(--text-navy-primary)', fontWeight: 800 }}>
          Manager Approval & Exceptions Queue
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-navy-secondary)', maxWidth: 800, marginTop: 4, lineHeight: 1.5 }}>
          Authorized approvers can inspect original uploaded receipts, extracted financial data, GST breakdown, policy limits, and arithmetic checks. Every decision is recorded with reviewer identity, timestamp, and disposition reason in the immutable audit trail.
        </p>

        {isFinance && (
          <div style={{
            marginTop: 12,
            padding: '8px 14px',
            background: 'var(--pastel-blue-bg)',
            border: '1px solid var(--pastel-blue-border)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--pastel-blue-text)',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <HelpCircle size={15} />
            <span>
              <strong>Finance Read-Only Mode:</strong> Finance auditors can review compliance, duplicate checks, and tax calculations. Server-side approval decisions are restricted to authorized Manager/Approver and Admin roles.
            </span>
          </div>
        )}
      </div>

      {/* Approvals Table */}
      <div className="glass-panel" style={{ padding: 24, border: '1px solid var(--border-purple-thin)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, color: 'var(--text-navy-primary)', fontWeight: 700 }}>
            Pending Authorization Queue ({pendingApprovals.length} Claims)
          </h3>
          <span style={{ fontSize: 12, color: 'var(--text-navy-muted)' }}>
            Logged in as: <strong>{user?.name}</strong> ({user?.role})
          </span>
        </div>

        {pendingApprovals.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-navy-muted)' }}>
            No claims currently pending approval. All submitted expenses are up to date!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {pendingApprovals.map((item) => (
              <div
                key={item.id}
                style={{
                  padding: 18,
                  background: 'var(--bg-card-subtle)',
                  borderRadius: 10,
                  border: '1px solid var(--border-purple-thin)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  transition: 'box-shadow 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: 'var(--pastel-blue-bg)',
                      border: '1px solid var(--pastel-blue-border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--pastel-blue-text)'
                    }}>
                      <FileText size={20} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-navy-primary)' }}>
                          {item.merchant}
                        </span>
                        <span className="mono" style={{ fontSize: 11, color: '#7c3aed' }}>#{item.id}</span>
                        <span className={`badge badge-${item.status.toLowerCase().replace(/\s+/g, '-')}`}>
                          {item.status}
                        </span>
                        {item.arithmetic_mismatch && (
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 99,
                            background: 'var(--beige-bg)',
                            color: 'var(--beige-text)',
                            border: '1px solid var(--beige-border)'
                          }}>
                            Arithmetic Flag
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-navy-muted)', marginTop: 3 }}>
                        Employee: <strong>{item.employee_id}</strong> • Date: {item.date} • Category: {item.category} • Method: {item.payment_method || 'Corporate Card'}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>
                      ₹{item.amount_inr.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 11, color: item.excess_amount > 0 ? '#b91c1c' : '#15803d', fontWeight: 600 }}>
                      Eligible: ₹{item.eligible_amount.toFixed(2)} {item.excess_amount > 0 && `(₹${item.excess_amount.toFixed(2)} excess)`}
                    </div>
                  </div>
                </div>

                {/* GST & Financial Breakdown Strip */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '8px 14px',
                  background: '#ffffff',
                  border: '1px solid #ede9fe',
                  borderRadius: 6,
                  fontSize: 11,
                  color: 'var(--text-navy-secondary)',
                  flexWrap: 'wrap'
                }}>
                  <span>Subtotal: <strong>₹{(item.subtotal || item.amount).toFixed(2)}</strong></span>
                  {(item.tax_percentage != null && item.tax_percentage > 0) && (
                    <span>Tax Rate: <strong>{item.tax_percentage}%</strong></span>
                  )}
                  {(item.cgst_amount != null && item.cgst_amount > 0) && (
                    <span>CGST: <strong>₹{item.cgst_amount.toFixed(2)}</strong></span>
                  )}
                  {(item.sgst_amount != null && item.sgst_amount > 0) && (
                    <span>SGST: <strong>₹{item.sgst_amount.toFixed(2)}</strong></span>
                  )}
                  {(item.igst_amount != null && item.igst_amount > 0) && (
                    <span>IGST: <strong>₹{item.igst_amount.toFixed(2)}</strong></span>
                  )}
                  <span>Total Tax: <strong>₹{(item.tax_amount || 0).toFixed(2)}</strong></span>
                  {item.receipt_number && (
                    <span>Receipt/Bill #: <strong className="mono">{item.receipt_number}</strong></span>
                  )}
                  {item.raw_file_url && (
                    <a
                      href={`http://127.0.0.1:8000${item.raw_file_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        marginLeft: 'auto',
                        color: '#7c3aed',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        textDecoration: 'none'
                      }}
                    >
                      <ExternalLink size={12} />
                      <span>View Original File</span>
                    </a>
                  )}
                </div>

                {/* Approver Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
                  <button
                    onClick={() => onSelectExpense(item)}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    <Eye size={13} />
                    <span>Inspect Policy & Original Receipt</span>
                  </button>

                  {isManagerOrAdmin ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => handleOpenActionModal(item, 'REQUEST_CLARIFICATION')}
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#d97706', borderColor: '#fde68a', background: '#fefce8' }}
                      >
                        Clarify
                      </button>
                      <button
                        onClick={() => handleOpenActionModal(item, 'REJECT')}
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#dc2626', borderColor: '#fecdd3', background: '#fff1f2' }}
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleOpenActionModal(item, 'APPROVE')}
                        className="btn btn-primary btn-sm"
                        style={{ background: '#16a34a', borderColor: '#16a34a' }}
                      >
                        Approve
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text-navy-muted)', fontStyle: 'italic' }}>
                      Approval actions require Manager role
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decision Confirmation Modal with Reason */}
      {actionModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid var(--border-purple-thin)',
            width: '100%',
            maxWidth: 500,
            padding: 24,
            boxShadow: 'var(--modal-shadow)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-navy-primary)' }}>
                {actionModal.title}
              </h3>
              <button
                onClick={() => setActionModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-navy-muted)' }}
              >
                ✕
              </button>
            </div>

            <div style={{
              padding: 12,
              background: 'var(--bg-main)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--text-navy-secondary)'
            }}>
              <div>Claim: <strong>#{actionModal.expenseId}</strong> • {actionModal.merchant}</div>
              <div>Amount: <strong>₹{actionModal.amount.toFixed(2)}</strong></div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-navy-secondary)', display: 'block', marginBottom: 4 }}>
                DISPOSITION REASON / NOTES (RECORDED IN AUDIT TRAIL) *
              </label>
              <textarea
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                rows={3}
                style={{ width: '100%', fontSize: 13, padding: 10, borderRadius: 6, border: '1px solid var(--border-purple-thin)' }}
                placeholder="Enter disposition reasoning..."
              />
            </div>

            {actionError && (
              <div style={{
                padding: 10,
                background: 'var(--rose-bg)',
                border: '1px solid var(--rose-border)',
                borderRadius: 6,
                color: 'var(--rose-text)',
                fontSize: 12
              }}>
                {actionError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setActionModal(null)}
                disabled={isSubmitting}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={isSubmitting || !reasonText.trim()}
                className="btn btn-primary"
                style={{
                  background: actionModal.action === 'REJECT' ? '#dc2626' : (actionModal.action === 'APPROVE' ? '#16a34a' : '#7c3aed')
                }}
              >
                <span>{isSubmitting ? 'Recording Decision...' : 'Confirm Decision'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
