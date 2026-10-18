import React from 'react';
import {
  TrendingUp, CheckCircle, Clock, AlertTriangle, ShieldAlert,
  ArrowUpRight, Sparkles, User, RefreshCw, Zap, Eye
} from 'lucide-react';
import { OverviewStats, Expense } from '../types';

interface OverviewDashboardProps {
  stats: OverviewStats | null;
  expenses: Expense[];
  onSelectExpense: (expense: Expense) => void;
  onSimulateTimeMachine: () => Promise<void>;
  isSimulating: boolean;
  onNavigateToTimeMachine: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  stats,
  expenses,
  onSelectExpense,
  onSimulateTimeMachine,
  isSimulating,
  onNavigateToTimeMachine
}) => {
  if (!stats) return <div style={{ padding: 40, textAlign: 'center' }}>Loading dashboard metrics...</div>;

  const urgentQueue = expenses
    .filter((e) => ['Needs Clarification', 'Under Review', 'Pending Approval'].includes(e.status) || e.has_duplicate_warning)
    .slice(0, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Signature Feature Banner: Time Machine One-Click Showcase */}
      <div className="glass-panel" style={{
        padding: '20px 28px',
        background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.45) 0%, rgba(30, 27, 75, 0.6) 100%)',
        border: '1px solid rgba(168, 85, 247, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 800 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{
              padding: '3px 9px',
              borderRadius: 99,
              background: '#8b5cf6',
              color: '#ffffff',
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.05em'
            }}>
              COMPETITION SHOWCASE
            </span>
            <span style={{ fontSize: 13, color: '#e9d5ff', fontWeight: 600 }}>
              The Defining Innovation: Expense Time Machine
            </span>
          </div>
          <h2 style={{ fontSize: 22, color: '#f8fafc', marginBottom: 6 }}>
            Chronological Recalculation Engine
          </h2>
          <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>
            Demonstrates how an unexpected retroactive receipt (Lunch ₹1,400) automatically recalculates a prior provisional dinner claim (EXP-011), deducting ₹200 excess without human friction while preserving decision v1 in history.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, position: 'relative', zIndex: 2 }}>
          <button
            onClick={onSimulateTimeMachine}
            disabled={isSimulating}
            className="btn btn-purple"
            style={{ padding: '10px 18px', fontSize: 13, whiteSpace: 'nowrap' }}
          >
            <Zap size={16} />
            <span>{isSimulating ? 'Simulating...' : 'Simulate Retroactive Receipt'}</span>
          </button>
          <button
            onClick={onNavigateToTimeMachine}
            className="btn btn-secondary"
            style={{ padding: '10px 16px', fontSize: 13 }}
          >
            <span>Open Time Machine</span>
            <ArrowUpRight size={15} />
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: 16
      }}>
        {/* Total Submitted */}
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL SUBMITTED</span>
            <div style={{ padding: 6, borderRadius: 8, background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mono" style={{ fontSize: 26, fontWeight: 700, color: '#f8fafc', marginTop: 10 }}>
            ₹{stats.total_submitted_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
            {stats.expenses_count} expenses from {stats.employees_count} employees
          </div>
        </div>

        {/* Total Eligible */}
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>CURRENTLY ELIGIBLE</span>
            <div style={{ padding: 6, borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>
              <CheckCircle size={16} />
            </div>
          </div>
          <div className="mono" style={{ fontSize: 26, fontWeight: 700, color: '#34d399', marginTop: 10 }}>
            ₹{stats.total_eligible_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
            {((stats.total_eligible_amount / Math.max(1, stats.total_submitted_amount)) * 100).toFixed(1)}% policy compliance rate
          </div>
        </div>

        {/* Potential Duplicate Exposure */}
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>DUPLICATE EXPOSURE</span>
            <div style={{ padding: 6, borderRadius: 8, background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="mono" style={{ fontSize: 26, fontWeight: 700, color: '#f87171', marginTop: 10 }}>
            ₹{stats.potential_duplicate_exposure.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
            Intercepted before reimbursement
          </div>
        </div>

        {/* Time Machine Recalculations */}
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>DECISIONS RECALCULATED</span>
            <div style={{ padding: 6, borderRadius: 8, background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
              <RefreshCw size={16} />
            </div>
          </div>
          <div className="mono" style={{ fontSize: 26, fontWeight: 700, color: '#c084fc', marginTop: 10 }}>
            {stats.decisions_changed_by_evidence}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
            Updated dynamically by Time Machine
          </div>
        </div>

        {/* Time Saved */}
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>AUDIT TIME SAVED</span>
            <div style={{ padding: 6, borderRadius: 8, background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4' }}>
              <Clock size={16} />
            </div>
          </div>
          <div className="mono" style={{ fontSize: 26, fontWeight: 700, color: '#38bdf8', marginTop: 10 }}>
            {stats.estimated_review_time_saved_hours} hrs
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
            vs 15 min manual baseline audit
          </div>
        </div>
      </div>

      {/* Two Column Grid: Priority Review Queue & Spending Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        {/* Priority Review Queue */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ fontSize: 17, color: '#f8fafc' }}>
                Priority Audit Queue
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Items requiring clarification, secondary approval, or duplicate review
              </p>
            </div>
            <span className="badge badge-clarification">
              {stats.total_awaiting_review} Pending
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {urgentQueue.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectExpense(item)}
                style={{
                  padding: '12px 16px',
                  background: 'rgba(30, 41, 59, 0.4)',
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: 'rgba(15, 23, 42, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    fontSize: 12,
                    fontWeight: 700
                  }}>
                    {item.category.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>
                      {item.merchant}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {item.employee_id} • {item.date} • {item.category}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div className="mono" style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                      ₹{item.amount_inr.toFixed(2)}
                    </div>
                    <span className={`badge ${
                      item.status === 'Needs Clarification' ? 'badge-clarification' :
                      item.status === 'Pending Approval' ? 'badge-pending-approval' : 'badge-partially-eligible'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <Eye size={16} color="var(--text-muted)" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live System Guardrails & Policy Health */}
        <div className="glass-panel" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 17, color: '#f8fafc' }}>
            Auditing Guardrails Status
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{
              padding: 14,
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>Deterministic Rule Engine</span>
                <span style={{ color: '#34d399', fontWeight: 600 }}>Active (v2026.4)</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                7 active policy rules evaluated deterministically per submission.
              </div>
            </div>

            <div style={{
              padding: 14,
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>Duplicate Detective</span>
                <span style={{ color: '#38bdf8', fontWeight: 600 }}>pHash & Multi-Factor</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                Comparing image hashes, invoice numbers, line items, and temporal clusters.
              </div>
            </div>

            <div style={{
              padding: 14,
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: 8,
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)' }}>Risk Radar</span>
                <span style={{ color: '#fbbf24', fontWeight: 600 }}>{stats.active_risk_alerts_count} Active Alerts</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                Tracking threshold evasion (claims @ ₹4,950), split invoices, weekend dates.
              </div>
            </div>
          </div>

          <div style={{
            marginTop: 'auto',
            padding: 12,
            background: 'rgba(6, 182, 212, 0.08)',
            border: '1px solid rgba(6, 182, 212, 0.25)',
            borderRadius: 8,
            fontSize: 11,
            color: '#38bdf8',
            lineHeight: 1.5
          }}>
            <strong>Core Principle:</strong> AI interprets messy evidence. A deterministic policy engine evaluates rules. Humans resolve consequential uncertainty.
          </div>
        </div>
      </div>
    </div>
  );
};
