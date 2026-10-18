import React, { useState, useEffect } from 'react';
import {
  UploadCloud, FileText, CheckCircle2, AlertTriangle, Clock,
  ArrowRight, Sparkles, HelpCircle, Eye, DollarSign, Calendar
} from 'lucide-react';
import { api } from '../api/client';
import { Expense, User } from '../types';

interface EmployeeDashboardProps {
  user: User;
  expenses: Expense[];
  onSelectExpense: (exp: Expense) => void;
  onRefreshAll: () => Promise<void>;
  onNavigateToInbox: () => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({
  user,
  expenses,
  onSelectExpense,
  onRefreshAll,
  onNavigateToInbox
}) => {
  const [allowanceSnapshot, setAllowanceSnapshot] = useState<any>(null);

  // Filter only claims submitted by this employee
  const myExpenses = (expenses || []).filter(
    (e) => e && (e.employee_id === user.employee_id || e.employee_id === user.id)
  );

  const needsClarification = myExpenses.filter(
    (e) => e && (e.status === 'Needs Clarification' || (e.missing_fields && e.missing_fields.length > 0))
  );
  const approvedTotal = myExpenses
    .filter((e) => e && (e.status === 'Approved' || e.status === 'Partially Eligible'))
    .reduce((sum, e) => sum + (e.eligible_amount || 0), 0);

  const loadAllowance = async () => {
    try {
      const snap = await api.getAllowanceSnapshot(user.employee_id || 'EMP-001', '2026-10-13', 'Meals');
      setAllowanceSnapshot(snap);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAllowance();
  }, [user]);

  const dailyCap = allowanceSnapshot?.daily_limit || 2000.0;
  const spentToday = allowanceSnapshot?.spent_today || 0.0;
  const remainingToday = Math.max(0, dailyCap - spentToday);
  const percentDaily = Math.min(100, Math.round((spentToday / dailyCap) * 100));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Employee Welcome Banner */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        background: 'linear-gradient(135deg, rgba(224, 242, 254, 0.7) 0%, rgba(254, 243, 199, 0.4) 100%)',
        border: '1px solid #c4b5fd',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              padding: '2px 8px',
              borderRadius: 99,
              background: '#ede9fe',
              color: '#6d28d9',
              fontSize: 11,
              fontWeight: 700
            }}>
              EMPLOYEE WORKSPACE
            </span>
            <span style={{ fontSize: 13, color: '#64748b' }}>
              {user.department} • {user.employee_id || 'ID Pending'}
            </span>
          </div>
          <h2 style={{ fontSize: 24, color: '#0f172a' }}>
            Welcome back, {user.name}
          </h2>
          <p style={{ fontSize: 13, color: '#475569', maxWidth: 650, marginTop: 4 }}>
            Drop receipts here and let Expense Autopilot automatically extract fields, verify compliance against your travel policy, and calculate your allowances.
          </p>
        </div>

        <button
          onClick={onNavigateToInbox}
          className="btn btn-primary"
          style={{ padding: '10px 18px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <UploadCloud size={16} />
          <span>Upload New Receipt</span>
        </button>
      </div>

      {/* Action Required Alert Banner */}
      {needsClarification.length > 0 && (
        <div style={{
          padding: '16px 20px',
          background: '#fef3c7',
          border: '1px solid #fde68a',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle size={20} color="#b45309" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>
                Action Required: {needsClarification.length} claim(s) require missing information
              </div>
              <div style={{ fontSize: 12, color: '#78350f', marginTop: 2 }}>
                e.g. {needsClarification[0]?.merchant || 'Recent claim'} is missing mandatory client name & attendee headcount required by policy.
              </div>
            </div>
          </div>
          <button
            onClick={() => onSelectExpense(needsClarification[0])}
            className="btn btn-secondary btn-sm"
            style={{ background: '#ffffff', borderColor: '#d97706', color: '#92400e' }}
          >
            Supply Details Now
          </button>
        </div>
      )}

      {/* KPI Metric HUD: Employee Allowances & Spend */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {/* Remaining Today */}
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>REMAINING TODAY (MEALS)</span>
            <Clock size={16} color="#0284c7" />
          </div>
          <div className="mono" style={{ fontSize: 26, fontWeight: 700, color: '#0369a1' }}>
            ₹{remainingToday.toFixed(2)}
          </div>
          <div style={{
            height: 6,
            background: '#e2e8f0',
            borderRadius: 99,
            overflow: 'hidden',
            margin: '10px 0 6px 0'
          }}>
            <div style={{
              height: '100%',
              width: `${percentDaily}%`,
              background: 'linear-gradient(90deg, #38bdf8, #0284c7)'
            }} />
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>
            Cap: ₹{dailyCap.toFixed(2)} • Spent today: ₹{spentToday.toFixed(2)}
          </div>
        </div>

        {/* My Total Claims */}
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>MY SUBMITTED EXPENSES</span>
            <FileText size={16} color="#7c3aed" />
          </div>
          <div className="mono" style={{ fontSize: 26, fontWeight: 700, color: '#0f172a' }}>
            {myExpenses.length} Claims
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 10 }}>
            {myExpenses.filter((e) => e.status === 'Approved').length} Approved • {myExpenses.filter((e) => e.status === 'Needs Clarification').length} Clarification
          </div>
        </div>

        {/* Total Reimbursed/Eligible */}
        <div className="glass-panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>CURRENTLY ELIGIBLE REIMBURSEMENT</span>
            <CheckCircle2 size={16} color="#059669" />
          </div>
          <div className="mono" style={{ fontSize: 26, fontWeight: 700, color: '#059669' }}>
            ₹{approvedTotal.toFixed(2)}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 10 }}>
            All eligible claims ready for payment processing
          </div>
        </div>
      </div>

      {/* My Claims Table */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, color: '#0f172a' }}>
            My Expense Claims & Statuses ({myExpenses.length})
          </h3>
          <span style={{ fontSize: 11, color: '#64748b' }}>
            Server-side isolated to {user.name} ({user.employee_id})
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#fbfbfe', borderBottom: '1px solid #ede9fe' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: '#64748b' }}>Claim ID</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: '#64748b' }}>Date</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: '#64748b' }}>Merchant</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: '#64748b' }}>Category</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', color: '#64748b' }}>Claim Amount</th>
                <th style={{ textAlign: 'right', padding: '10px 14px', color: '#64748b' }}>Eligible (INR)</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', color: '#64748b' }}>Decision Version</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', color: '#64748b' }}>Status</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', color: '#64748b' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {myExpenses.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid #ede9fe' }}>
                  <td className="mono" style={{ padding: '12px 14px', color: '#7c3aed', fontWeight: 600 }}>
                    {e.id}
                  </td>
                  <td className="mono" style={{ padding: '12px 14px', color: '#64748b', fontSize: 12 }}>
                    {e.date}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>
                    {e.merchant}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748b' }}>
                    {e.category}
                  </td>
                  <td className="mono" style={{ textAlign: 'right', padding: '12px 14px', color: '#0f172a' }}>
                    {e.currency} {e.amount.toFixed(2)}
                  </td>
                  <td className="mono" style={{ textAlign: 'right', padding: '12px 14px', color: '#059669', fontWeight: 700 }}>
                    ₹{e.eligible_amount.toFixed(2)}
                  </td>
                  <td className="mono" style={{ textAlign: 'center', padding: '12px 14px' }}>
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: e.active_decision_version > 1 ? '#ede9fe' : '#f1f5f9',
                      color: e.active_decision_version > 1 ? '#6d28d9' : '#64748b',
                      fontSize: 10,
                      fontWeight: 700
                    }}>
                      v{e.active_decision_version}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 14px' }}>
                    <span className={`badge ${
                      e.status === 'Approved' ? 'badge-approved' :
                      e.status === 'Partially Eligible' ? 'badge-partially-eligible' :
                      e.status === 'Needs Clarification' ? 'badge-clarification' :
                      e.status === 'Pending Approval' ? 'badge-pending-approval' : 'badge-rejected'
                    }`}>
                      {e.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 14px' }}>
                    <button
                      onClick={() => onSelectExpense(e)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '3px 8px' }}
                    >
                      <Eye size={12} /> View
                    </button>
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
