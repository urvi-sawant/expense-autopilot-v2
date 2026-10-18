import React, { useState, useEffect } from 'react';
import {
  Clock, Zap, ArrowRight, CheckCircle2, AlertTriangle, RefreshCw,
  Calendar, User, DollarSign, Layers, ChevronRight, Play, Pause
} from 'lucide-react';
import { api } from '../api/client';
import { Expense } from '../types';

interface TimeMachineLedgerProps {
  expenses: Expense[];
  onSelectExpense: (exp: Expense) => void;
  onRefreshAll: () => Promise<void>;
}

export const TimeMachineLedger: React.FC<TimeMachineLedgerProps> = ({
  expenses,
  onSelectExpense,
  onRefreshAll
}) => {
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);
  const [selectedEventIndex, setSelectedEventIndex] = useState<number>(0);
  const [allowanceSnapshot, setAllowanceSnapshot] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationMessage, setSimulationMessage] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState('EMP-001');

  useEffect(() => {
    loadTimeline();
  }, [selectedEmployee]);

  const loadTimeline = async () => {
    try {
      const data = await api.getTimeline(selectedEmployee);
      setTimelineEvents(data);
      if (data.length > 0) {
        setSelectedEventIndex(data.length - 1);
      }
      const snap = await api.getAllowanceSnapshot(selectedEmployee, '2026-10-13', 'Meals');
      setAllowanceSnapshot(snap);
    } catch (err) {
      console.error('Failed loading timeline:', err);
    }
  };

  const handleSimulateRetroactive = async () => {
    setIsSimulating(true);
    setSimulationMessage(null);
    try {
      const res = await api.simulateRetroactiveReceipt();
      setSimulationMessage(res.message);
      await loadTimeline();
      await onRefreshAll();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const currentEvent = timelineEvents[selectedEventIndex];

  // Daily Allowance Calculation for Priya Sharma on 2026-10-13
  const dailyCap = allowanceSnapshot?.daily_limit || 2000.0;
  const spentToday = allowanceSnapshot?.spent_today || 0.0;
  const remainingToday = Math.max(0, dailyCap - spentToday);
  const percentUsed = Math.min(100, Math.round((spentToday / dailyCap) * 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.4) 0%, rgba(30, 27, 75, 0.6) 100%)',
        border: '1px solid rgba(168, 85, 247, 0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{
              padding: '3px 9px',
              borderRadius: 99,
              background: '#8b5cf6',
              color: '#ffffff',
              fontSize: 10,
              fontWeight: 800
            }}>
              SIGNATURE FEATURE
            </span>
            <span style={{ fontSize: 13, color: '#e9d5ff', fontWeight: 600 }}>
              Event-Driven Temporal Ledger
            </span>
          </div>
          <h2 style={{ fontSize: 24, color: '#f8fafc' }}>
            Expense Time Machine
          </h2>
          <p style={{ fontSize: 13, color: '#cbd5e1', maxWidth: 750, marginTop: 4, lineHeight: 1.5 }}>
            Recalculates affected compliance decisions whenever new evidence or receipts arrive out of sequence. Preserves decision versions, explains recalculations, and tracks cumulative allowances.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          <button
            onClick={handleSimulateRetroactive}
            disabled={isSimulating}
            className="btn btn-purple"
            style={{ padding: '10px 18px', fontSize: 13 }}
          >
            <Zap size={16} />
            <span>{isSimulating ? 'Recalculating...' : 'Trigger Retroactive Receipt Test'}</span>
          </button>
          <span style={{ fontSize: 11, color: '#e9d5ff' }}>
            Tests Scenario 15: Ingests lunch; recalculates dinner into v2 with ₹200 excess
          </span>
        </div>
      </div>

      {/* Simulation Feedback Alert */}
      {simulationMessage && (
        <div style={{
          padding: '14px 20px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          borderRadius: 10,
          color: '#34d399',
          fontSize: 13,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <CheckCircle2 size={18} />
          <span>{simulationMessage}</span>
        </div>
      )}

      {/* Allowance State HUD & Interactive Scrubber */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
        {/* Allowance Gauges */}
        <div className="glass-panel" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 16, color: '#f8fafc' }}>
              Allowance Tracker
            </h3>
            <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600 }}>
              Mumbai Tier 1 • Meals
            </span>
          </div>

          {/* Daily Allowance Progress Meter */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)' }}>Daily Allowance (2026-10-13)</span>
              <span className="mono" style={{ color: percentUsed > 100 ? '#fb7185' : '#34d399', fontWeight: 700 }}>
                ₹{spentToday.toFixed(2)} / ₹{dailyCap.toFixed(2)} ({percentUsed}%)
              </span>
            </div>
            <div style={{
              height: 10,
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: 99,
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, percentUsed)}%`,
                background: percentUsed > 100 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #06b6d4, #10b981)',
                borderRadius: 99,
                transition: 'width 0.4s ease'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }} className="mono">
              <span>Remaining Today: ₹{remainingToday.toFixed(2)}</span>
              {spentToday > dailyCap && (
                <span style={{ color: '#fb7185', fontWeight: 600 }}>Excess Breached: ₹{(spentToday - dailyCap).toFixed(2)}</span>
              )}
            </div>
          </div>

          {/* Monthly Budget Progress Meter */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)' }}>Monthly Travel Budget</span>
              <span className="mono" style={{ color: '#f8fafc', fontWeight: 600 }}>
                ₹{(allowanceSnapshot?.spent_this_month || 0).toFixed(2)} / ₹{(allowanceSnapshot?.monthly_budget || 60000).toFixed(2)}
              </span>
            </div>
            <div style={{
              height: 8,
              background: 'rgba(30, 41, 59, 0.8)',
              borderRadius: 99,
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, Math.round(((allowanceSnapshot?.spent_this_month || 0) / (allowanceSnapshot?.monthly_budget || 60000)) * 100))}%`,
                background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                borderRadius: 99
              }} />
            </div>
          </div>

          <div style={{
            padding: 12,
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: 8,
            border: '1px solid var(--border-subtle)',
            fontSize: 11,
            color: 'var(--text-muted)',
            lineHeight: 1.5
          }}>
            <strong>Deterministic Rule RULE-MEAL-TIER1:</strong> Allows up to ₹2,000/day for Tier 1 locations with partial reimbursement up to the remaining allowance.
          </div>
        </div>

        {/* Interactive Event Playback Scrubber */}
        <div className="glass-panel" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: 16, color: '#f8fafc' }}>
                Timeline Scrubber
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                Step through event sequence to see how balances evolved
              </p>
            </div>
            <span className="mono" style={{ fontSize: 12, color: '#c084fc', fontWeight: 600 }}>
              Event {selectedEventIndex + 1} of {timelineEvents.length}
            </span>
          </div>

          {/* Scrubber Range Slider */}
          {timelineEvents.length > 0 && (
            <div>
              <input
                type="range"
                min={0}
                max={timelineEvents.length - 1}
                value={selectedEventIndex}
                onChange={(e) => setSelectedEventIndex(parseInt(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: '#8b5cf6',
                  cursor: 'pointer'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>
                <span>Earliest Submission</span>
                <span>Latest Recalculation State</span>
              </div>
            </div>
          )}

          {/* Current Event Card Highlight */}
          {currentEvent && (
            <div style={{
              padding: 16,
              background: currentEvent.type === 'DECISION_RECALCULATED' ? 'rgba(88, 28, 135, 0.35)' : 'rgba(15, 23, 42, 0.6)',
              border: `1px solid ${currentEvent.type === 'DECISION_RECALCULATED' ? 'rgba(168, 85, 247, 0.4)' : 'var(--border-subtle)'}`,
              borderRadius: 10
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: currentEvent.type === 'DECISION_RECALCULATED' ? '#7c3aed' : '#0284c7',
                    color: '#ffffff',
                    fontSize: 10,
                    fontWeight: 700
                  }}>
                    {currentEvent.type}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                    {currentEvent.merchant}
                  </span>
                </div>
                <span className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                  {new Date(currentEvent.timestamp).toLocaleString()}
                </span>
              </div>

              <div style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 8 }}>
                {currentEvent.description}
              </div>

              <div style={{
                display: 'flex',
                gap: 20,
                fontSize: 12,
                padding: '6px 12px',
                background: 'rgba(5, 8, 16, 0.5)',
                borderRadius: 6
              }} className="mono">
                <span>Total: ₹{currentEvent.amount_inr?.toFixed(2)}</span>
                <span>Eligible: <strong style={{ color: '#34d399' }}>₹{currentEvent.eligible_amount?.toFixed(2)}</strong></span>
                <span>Excess: <strong style={{ color: '#fb7185' }}>₹{currentEvent.excess_amount?.toFixed(2)}</strong></span>
                <span>Status: <strong>{currentEvent.status}</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chronological Event Ledger Table */}
      <div className="glass-panel" style={{ padding: 24 }}>
        <h3 style={{ fontSize: 17, color: '#f8fafc', marginBottom: 14 }}>
          Chronological Event Ledger
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(30, 41, 59, 0.5)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--text-muted)' }}>Timestamp</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--text-muted)' }}>Event Type</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--text-muted)' }}>Merchant</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', color: 'var(--text-muted)' }}>Amount</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', color: 'var(--text-muted)' }}>Eligible</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', color: 'var(--text-muted)' }}>Excess</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', color: 'var(--text-muted)' }}>Version</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', color: 'var(--text-muted)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {timelineEvents.map((evt, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    background: evt.type === 'DECISION_RECALCULATED' ? 'rgba(88, 28, 135, 0.15)' : 'transparent',
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedEventIndex(idx)}
                >
                  <td className="mono" style={{ padding: '10px 14px', color: 'var(--text-dim)', fontSize: 11 }}>
                    {evt.timestamp}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 99,
                      fontSize: 10,
                      fontWeight: 700,
                      background: evt.type === 'DECISION_RECALCULATED' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                      color: evt.type === 'DECISION_RECALCULATED' ? '#c084fc' : '#38bdf8'
                    }}>
                      {evt.type}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>{evt.merchant}</td>
                  <td className="mono" style={{ textAlign: 'right', padding: '10px 14px' }}>₹{evt.amount_inr?.toFixed(2)}</td>
                  <td className="mono" style={{ textAlign: 'right', padding: '10px 14px', color: '#34d399', fontWeight: 600 }}>
                    ₹{evt.eligible_amount?.toFixed(2)}
                  </td>
                  <td className="mono" style={{ textAlign: 'right', padding: '10px 14px', color: evt.excess_amount > 0 ? '#fb7185' : 'var(--text-dim)' }}>
                    ₹{evt.excess_amount?.toFixed(2)}
                  </td>
                  <td className="mono" style={{ textAlign: 'center', padding: '10px 14px' }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: evt.version > 1 ? '#7c3aed' : 'rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      fontSize: 10,
                      fontWeight: 700
                    }}>
                      v{evt.version}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '10px 14px' }}>
                    <span className={`badge ${
                      evt.status === 'Approved' ? 'badge-approved' :
                      evt.status === 'Partially Eligible' ? 'badge-partially-eligible' :
                      evt.status === 'Needs Clarification' ? 'badge-clarification' : 'badge-rejected'
                    }`}>
                      {evt.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
