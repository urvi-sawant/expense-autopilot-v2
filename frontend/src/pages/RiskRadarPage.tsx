import React, { useState } from 'react';
import {
  ShieldAlert, AlertTriangle, CheckCircle, ArrowRight, X,
  Shield, ExternalLink, Flag, FileText, UserCheck
} from 'lucide-react';
import { api } from '../api/client';
import { RiskAlert, Expense } from '../types';

interface RiskRadarPageProps {
  alerts: RiskAlert[];
  expenses: Expense[];
  onSelectExpense: (exp: Expense) => void;
  onRefreshAll: () => Promise<void>;
}

export const RiskRadarPage: React.FC<RiskRadarPageProps> = ({
  alerts,
  expenses,
  onSelectExpense,
  onRefreshAll
}) => {
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [dismissReason, setDismissReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDismiss = async (alertId: string) => {
    setIsSubmitting(true);
    try {
      await api.dismissRiskAlert(alertId, dismissReason || 'Dismissed after auditor inspection');
      setDismissingId(null);
      setDismissReason('');
      await onRefreshAll();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEscalate = async (alertId: string) => {
    setIsSubmitting(true);
    try {
      await api.dismissRiskAlert(alertId, 'Escalated to Department Head for secondary audit');
      await onRefreshAll();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(30, 41, 59, 0.6) 100%)',
        border: '1px solid rgba(245, 158, 11, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <ShieldAlert size={16} color="#fbbf24" />
          <span style={{ fontSize: 13, color: '#fbbf24', fontWeight: 600 }}>
            Continuous Behavioral Auditing
          </span>
        </div>
        <h2 style={{ fontSize: 24, color: '#f8fafc' }}>
          Risk Radar: Explainable Anomaly Detection
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 750, marginTop: 4 }}>
          Transparent, rule-based anomaly detection identifying approval threshold evasion, split expense clustering, and non-business weekend claims. Never accuses employees of fraud; highlights patterns for human review.
        </p>
      </div>

      {/* Alert Cards Population */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="glass-panel"
            style={{
              padding: 22,
              border: `1px solid ${
                alert.status === 'Dismissed' ? 'var(--border-subtle)' :
                alert.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.4)' :
                alert.severity === 'MEDIUM' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(56, 189, 248, 0.3)'
              }`,
              opacity: alert.status === 'Dismissed' ? 0.6 : 1
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  padding: '3px 10px',
                  borderRadius: 99,
                  background:
                    alert.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.2)' :
                    alert.severity === 'MEDIUM' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                  color:
                    alert.severity === 'HIGH' ? '#f87171' :
                    alert.severity === 'MEDIUM' ? '#fbbf24' : '#38bdf8',
                  fontSize: 11,
                  fontWeight: 700
                }}>
                  {alert.severity} SEVERITY • {alert.alert_type}
                </span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  {alert.id}
                </span>
              </div>

              {alert.status === 'Dismissed' ? (
                <span className="badge badge-approved">
                  Dismissed
                </span>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setDismissingId(alert.id)}
                    className="btn btn-secondary btn-sm"
                  >
                    Dismiss with Reason
                  </button>
                  <button
                    onClick={() => handleEscalate(alert.id)}
                    className="btn btn-danger btn-sm"
                  >
                    Escalate to VP
                  </button>
                </div>
              )}
            </div>

            <h3 style={{ fontSize: 16, color: '#f8fafc', marginBottom: 6 }}>
              {alert.title}
            </h3>
            <p style={{ fontSize: 13, color: '#e2e8f0', lineHeight: 1.5, marginBottom: 12 }}>
              {alert.description}
            </p>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: 12,
              background: 'rgba(15, 23, 42, 0.6)',
              borderRadius: 8,
              fontSize: 12
            }}>
              <div>
                <strong style={{ color: 'var(--text-muted)' }}>Policy Citation: </strong>
                <span style={{ color: '#38bdf8' }}>{alert.policy_reference}</span>
              </div>
              <div>
                <strong style={{ color: 'var(--text-muted)' }}>Suggested Auditor Action: </strong>
                <span style={{ color: '#f8fafc' }}>{alert.suggested_action}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <strong style={{ color: 'var(--text-muted)' }}>Affected Expense IDs: </strong>
                {alert.affected_expense_ids.map((expId) => {
                  const exp = expenses.find((e) => e.id === expId);
                  return (
                    <button
                      key={expId}
                      onClick={() => exp && onSelectExpense(exp)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '2px 8px', fontSize: 11 }}
                    >
                      <span className="mono">#{expId}</span>
                      <ExternalLink size={11} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dismissal Reason Drawer */}
            {dismissingId === alert.id && (
              <div style={{
                marginTop: 14,
                padding: 14,
                background: 'rgba(30, 41, 59, 0.6)',
                borderRadius: 8,
                border: '1px solid rgba(245, 158, 11, 0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#f8fafc' }}>
                  Record Justification for Dismissal (Logged to Audit Trail)
                </div>
                <input
                  type="text"
                  placeholder="e.g. Employee provided approved travel exception form..."
                  value={dismissReason}
                  onChange={(e) => setDismissReason(e.target.value)}
                />
                <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-end' }}>
                  <button
                    onClick={() => setDismissingId(null)}
                    className="btn btn-secondary btn-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDismiss(alert.id)}
                    disabled={isSubmitting}
                    className="btn btn-primary btn-sm"
                  >
                    Save & Dismiss
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
