import React, { useState } from 'react';
import {
  Search, Filter, Download, Eye, AlertTriangle, CheckCircle,
  FileText, Clock, HelpCircle
} from 'lucide-react';
import { Expense } from '../types';

interface ExpenseQueueProps {
  expenses: Expense[];
  onSelectExpense: (exp: Expense) => void;
}

export const ExpenseQueue: React.FC<ExpenseQueueProps> = ({
  expenses,
  onSelectExpense
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedEmployee, setSelectedEmployee] = useState('All');

  // Filter expenses
  const filtered = expenses.filter((e) => {
    const matchesSearch =
      search === '' ||
      e.merchant.toLowerCase().includes(search.toLowerCase()) ||
      e.id.toLowerCase().includes(search.toLowerCase()) ||
      (e.receipt_number && e.receipt_number.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;
    const matchesStatus = selectedStatus === 'All' || e.status === selectedStatus;
    const matchesEmployee = selectedEmployee === 'All' || e.employee_id === selectedEmployee;

    return matchesSearch && matchesCategory && matchesStatus && matchesEmployee;
  });

  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Employee', 'Merchant', 'Category', 'Amount INR', 'Eligible Amount', 'Status', 'Decision Version'];
    const rows = filtered.map((e) => [
      e.id,
      e.date,
      e.employee_id,
      `"${e.merchant}"`,
      e.category,
      e.amount_inr,
      e.eligible_amount,
      e.status,
      e.active_decision_version
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `expense_autopilot_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Top Controls & Search Bar */}
      <div className="glass-panel" style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 14
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 280 }}>
          <div style={{
            position: 'relative',
            flex: 1,
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: 12 }} />
            <input
              type="text"
              placeholder="Search by merchant, invoice #, or expense ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: 36 }}
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="All">All Categories</option>
            <option value="Meals">Meals</option>
            <option value="Lodging">Lodging</option>
            <option value="Transport">Transport</option>
            <option value="Client Entertainment">Client Entertainment</option>
            <option value="Office Supplies">Office Supplies</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Partially Eligible">Partially Eligible</option>
            <option value="Needs Clarification">Needs Clarification</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Rejected">Rejected</option>
            <option value="Duplicate">Duplicate</option>
          </select>

          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
          >
            <option value="All">All Employees</option>
            <option value="EMP-001">EMP-001 (Priya Sharma)</option>
            <option value="EMP-002">EMP-002 (Rahul Verma)</option>
            <option value="EMP-003">EMP-003 (Ananya Iyer)</option>
            <option value="EMP-004">EMP-004 (Vikram Malhotra)</option>
          </select>
        </div>

        <button
          onClick={handleExportCSV}
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Download size={14} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Main Ledger Table */}
      <div className="glass-panel" style={{ padding: 20, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 17, color: '#f8fafc' }}>
            Master Expense Ledger ({filtered.length} Records)
          </h3>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Click any row to open side-by-side audit inspector
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(30, 41, 59, 0.6)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ textAlign: 'left', padding: '12px 14px', color: 'var(--text-muted)' }}>Expense ID</th>
                <th style={{ textAlign: 'left', padding: '12px 14px', color: 'var(--text-muted)' }}>Date</th>
                <th style={{ textAlign: 'left', padding: '12px 14px', color: 'var(--text-muted)' }}>Employee</th>
                <th style={{ textAlign: 'left', padding: '12px 14px', color: 'var(--text-muted)' }}>Merchant</th>
                <th style={{ textAlign: 'left', padding: '12px 14px', color: 'var(--text-muted)' }}>Category</th>
                <th style={{ textAlign: 'right', padding: '12px 14px', color: 'var(--text-muted)' }}>Claim Amount</th>
                <th style={{ textAlign: 'right', padding: '12px 14px', color: 'var(--text-muted)' }}>Eligible (INR)</th>
                <th style={{ textAlign: 'center', padding: '12px 14px', color: 'var(--text-muted)' }}>Flags</th>
                <th style={{ textAlign: 'center', padding: '12px 14px', color: 'var(--text-muted)' }}>Policy Status</th>
                <th style={{ textAlign: 'center', padding: '12px 14px', color: 'var(--text-muted)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onSelectExpense(item)}
                  style={{
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(30, 41, 59, 0.5)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td className="mono" style={{ padding: '12px 14px', color: '#38bdf8', fontWeight: 600 }}>
                    {item.id}
                  </td>
                  <td className="mono" style={{ padding: '12px 14px', color: 'var(--text-dim)', fontSize: 12 }}>
                    {item.date}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 12, color: '#f8fafc', fontWeight: 500 }}>
                      {item.employee_id}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#f8fafc' }}>
                    {item.merchant}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 12 }}>
                    {item.category}
                  </td>
                  <td className="mono" style={{ textAlign: 'right', padding: '12px 14px', color: '#f8fafc' }}>
                    {item.currency || 'INR'} {(item.amount || 0).toFixed(2)}
                  </td>
                  <td className="mono" style={{ textAlign: 'right', padding: '12px 14px', color: '#34d399', fontWeight: 700 }}>
                    ₹{(item.eligible_amount || 0).toFixed(2)}
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                      {(item.active_decision_version || 1) > 1 && (
                        <span style={{
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: '#7c3aed',
                          color: '#ffffff',
                          fontSize: 10,
                          fontWeight: 700
                        }} title="Recalculated by Time Machine">
                          v{item.active_decision_version}
                        </span>
                      )}
                      {item.arithmetic_mismatch && (
                        <span title="Arithmetic Discrepancy">
                          <AlertTriangle size={14} color="#f87171" />
                        </span>
                      )}
                      {item.has_duplicate_warning && (
                        <span title="Duplicate Warning">
                          <AlertTriangle size={14} color="#f59e0b" />
                        </span>
                      )}
                      {item.missing_fields && item.missing_fields.length > 0 && (
                        <span title="Missing Required Fields">
                          <HelpCircle size={14} color="#38bdf8" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 14px' }}>
                    <span className={`badge ${
                      item.status === 'Approved' ? 'badge-approved' :
                      item.status === 'Partially Eligible' ? 'badge-partially-eligible' :
                      item.status === 'Needs Clarification' ? 'badge-clarification' :
                      item.status === 'Pending Approval' ? 'badge-pending-approval' : 'badge-rejected'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 14px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '4px 8px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectExpense(item);
                      }}
                    >
                      <Eye size={13} />
                      <span>Inspect</span>
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
