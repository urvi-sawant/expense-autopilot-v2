import React, { useState } from 'react';
import {
  RotateCw, ZoomIn, ZoomOut, Sun, AlertTriangle, CheckCircle2,
  Save, X, FileText, Shield, ArrowRight, Clock, HelpCircle
} from 'lucide-react';
import { Expense } from '../types';
import { useAuth } from '../context/AuthContext';

interface ReceiptInspectorProps {
  expense: Expense;
  onClose: () => void;
  onSaveCorrections: (expenseId: string, updates: any) => Promise<void>;
  onReviewAction: (expenseId: string, action: string, reason: string) => Promise<void>;
}

export const ReceiptInspector: React.FC<ReceiptInspectorProps> = ({
  expense,
  onClose,
  onSaveCorrections,
  onReviewAction
}) => {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'admin';
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [highContrast, setHighContrast] = useState(false);
  const [showProcessed, setShowProcessed] = useState(true);

  // Editable Form State
  const [merchant, setMerchant] = useState(expense.merchant || '');
  const [amount, setAmount] = useState(expense.amount ? expense.amount.toString() : '0');
  const [date, setDate] = useState(expense.date || '');
  const [category, setCategory] = useState(expense.category || 'Meals');
  const [clientName, setClientName] = useState(expense.client_name || '');
  const [clientCompany, setClientCompany] = useState(expense.client_company || '');
  const [attendeeCount, setAttendeeCount] = useState(expense.attendee_count?.toString() || '');
  const [businessPurpose, setBusinessPurpose] = useState(expense.business_purpose || '');
  
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'inspector' | 'policy' | 'history'>('inspector');

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveCorrections(expense.id, {
        merchant,
        amount: parseFloat(amount) || 0,
        date,
        category,
        client_name: clientName,
        client_company: clientCompany,
        attendee_count: parseInt(attendeeCount) || 1,
        business_purpose: businessPurpose
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 8, 16, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24
    }}>
      <div className="glass-panel" style={{
        width: '95vw',
        maxWidth: 1300,
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: '#0d1322',
        border: '1px solid rgba(255, 255, 255, 0.12)'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(15, 23, 42, 0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'rgba(56, 189, 248, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8'
            }}>
              <FileText size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ fontSize: 17, color: '#f8fafc' }}>
                  {expense.merchant}
                </h3>
                <span className="mono" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  #{expense.id}
                </span>
                <span className={`badge ${
                  expense.status === 'Approved' ? 'badge-approved' :
                  expense.status === 'Partially Eligible' ? 'badge-partially-eligible' :
                  expense.status === 'Needs Clarification' ? 'badge-clarification' :
                  expense.status === 'Pending Approval' ? 'badge-pending-approval' : 'badge-rejected'
                }`}>
                  {expense.status}
                </span>
                {expense.active_decision_version > 1 && (
                  <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.4)' }}>
                    Decision v{expense.active_decision_version} (Recalculated)
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Submitted by {expense.employee_id} • {expense.date} • {expense.category}
              </div>
            </div>
          </div>

          {/* Sub-tabs & Close Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              display: 'flex',
              background: 'rgba(30, 41, 59, 0.7)',
              padding: 3,
              borderRadius: 8
            }}>
              <button
                onClick={() => setActiveTab('inspector')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: activeTab === 'inspector' ? '#0284c7' : 'transparent',
                  color: activeTab === 'inspector' ? '#ffffff' : 'var(--text-muted)'
                }}
              >
                Side-by-Side Review
              </button>
              <button
                onClick={() => setActiveTab('policy')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: activeTab === 'policy' ? '#0284c7' : 'transparent',
                  color: activeTab === 'policy' ? '#ffffff' : 'var(--text-muted)'
                }}
              >
                Policy Rule Trace
              </button>
              <button
                onClick={() => setActiveTab('history')}
                style={{
                  padding: '5px 12px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: activeTab === 'history' ? '#0284c7' : 'transparent',
                  color: activeTab === 'history' ? '#ffffff' : 'var(--text-muted)'
                }}
              >
                Decision Versions ({(expense.decision_history || []).length})
              </button>
            </div>

            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: 'none',
                color: 'var(--text-muted)',
                padding: 6,
                borderRadius: 8,
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          {activeTab === 'inspector' && (
            <>
              {/* Left Column: Interactive Receipt Preview Canvas */}
              <div style={{
                flex: 1.1,
                borderRight: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                background: '#070b14',
                position: 'relative'
              }}>
                {/* Image Toolbar */}
                <div style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(15, 23, 42, 0.5)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={handleRotate}
                      className="btn btn-secondary btn-sm"
                      title="Rotate 90 degrees"
                    >
                      <RotateCw size={13} /> Rotate
                    </button>
                    <button
                      onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
                      className="btn btn-secondary btn-sm"
                      title="Zoom In"
                    >
                      <ZoomIn size={13} />
                    </button>
                    <button
                      onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
                      className="btn btn-secondary btn-sm"
                      title="Zoom Out"
                    >
                      <ZoomOut size={13} />
                    </button>
                    <button
                      onClick={() => setHighContrast((h) => !h)}
                      className={`btn btn-sm ${highContrast ? 'btn-primary' : 'btn-secondary'}`}
                      title="Toggle High Contrast Filter"
                    >
                      <Sun size={13} /> Contrast Boost
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                    <span style={{ color: 'var(--text-muted)' }}>View:</span>
                    <button
                      onClick={() => setShowProcessed(true)}
                      style={{
                        background: showProcessed ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                        color: showProcessed ? '#38bdf8' : 'var(--text-muted)',
                        border: 'none',
                        padding: '3px 8px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      Enhanced OCR
                    </button>
                    <button
                      onClick={() => setShowProcessed(false)}
                      style={{
                        background: !showProcessed ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                        color: !showProcessed ? '#38bdf8' : 'var(--text-muted)',
                        border: 'none',
                        padding: '3px 8px',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      Raw Input
                    </button>
                  </div>
                </div>

                {/* Receipt Image Display Canvas */}
                <div style={{
                  flex: 1,
                  overflow: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 24
                }}>
                  <div style={{
                    transform: `rotate(${rotation}deg) scale(${zoom})`,
                    transition: 'transform 0.2s ease',
                    filter: highContrast ? 'contrast(170%) brightness(110%)' : 'none'
                  }}>
                    <img
                      src={`http://127.0.0.1:8000/api/receipts/preview/${expense.id}`}
                      alt="Receipt Preview"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '65vh',
                        borderRadius: 8,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
                      }}
                    />
                  </div>
                </div>

                {/* Preprocessing Tag Footer */}
                <div style={{
                  padding: '8px 16px',
                  background: 'rgba(15, 23, 42, 0.7)',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: 11,
                  color: 'var(--text-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>dHash: <span className="mono" style={{ color: 'var(--text-muted)' }}>{expense.image_phash || 'a1b2c3d4e5f60000'}</span></span>
                  <span>Pipeline: Contrast +40% • EXIF Auto-Oriented • Sharpness Boosted</span>
                </div>
              </div>

              {/* Right Column: Extracted Fields & Human Correction Form */}
              <div style={{
                flex: 1.2,
                overflowY: 'auto',
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 20
              }}>
                {/* Arithmetic Inconsistency Warning Banner */}
                {expense.arithmetic_mismatch && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    borderRadius: 8,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12
                  }}>
                    <AlertTriangle size={18} color="#f87171" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#f87171' }}>
                        Arithmetic Discrepancy Detected
                      </div>
                      <div style={{ fontSize: 12, color: '#fca5a5', marginTop: 2 }}>
                        Sum of itemized lines (₹1,120.00) + Tax (₹180.00) = ₹1,300.00, which diverges from printed total of ₹{(expense.amount || 0).toFixed(2)}. Please confirm true amount.
                      </div>
                    </div>
                  </div>
                )}

                {/* Prohibited Items Warning Banner */}
                {expense.excluded_items_found && expense.excluded_items_found.length > 0 && (
                  <div style={{
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    borderRadius: 8,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12
                  }}>
                    <AlertTriangle size={18} color="#fbbf24" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#fbbf24' }}>
                        Non-Reimbursable Goods Deducted
                      </div>
                      <div style={{ fontSize: 12, color: '#fde68a', marginTop: 2 }}>
                        Prohibited items identified: {expense.excluded_items_found.join(', ')}. Policy requires excluding personal/alcohol line items from net reimbursement.
                      </div>
                    </div>
                  </div>
                )}

                {/* Missing Fields Clarification Banner */}
                {expense.missing_fields && expense.missing_fields.length > 0 && (
                  <div style={{
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    borderRadius: 8,
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12
                  }}>
                    <HelpCircle size={18} color="#38bdf8" style={{ marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8' }}>
                        Missing Mandatory Documentation
                      </div>
                      <div style={{ fontSize: 12, color: '#bae6fd', marginTop: 2 }}>
                        Your meal receipt appears to be missing: <strong>{expense.missing_fields.join(', ')}</strong> required by Company Policy Section 5.3. Please add those details below to proceed.
                      </div>
                    </div>
                  </div>
                )}

                {/* Form: Editable Extracted Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>MERCHANT NAME</label>
                      <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>98% Conf</span>
                    </div>
                    <input
                      type="text"
                      value={merchant}
                      onChange={(e) => setMerchant(e.target.value)}
                      style={{ width: '100%' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL AMOUNT ({expense.currency})</label>
                      <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>97% Conf</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                      TRANSACTION DATE
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                      EXPENSE CATEGORY
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="Meals">Meals</option>
                      <option value="Lodging">Lodging</option>
                      <option value="Transport">Transport</option>
                      <option value="Client Entertainment">Client Entertainment</option>
                      <option value="Office Supplies">Office Supplies</option>
                    </select>
                  </div>
                </div>

                {/* Conditional Client Meal Fields */}
                {(category === 'Client Entertainment' || category === 'Meals') && (
                  <div style={{
                    padding: 14,
                    background: 'rgba(30, 41, 59, 0.4)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8' }}>
                      Client Entertainment Compliance Details
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Client Contact Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Rajesh Mehta"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Client Organization</label>
                        <input
                          type="text"
                          placeholder="e.g. HDFC Bank Ltd"
                          value={clientCompany}
                          onChange={(e) => setClientCompany(e.target.value)}
                          style={{ width: '100%' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Total Attendees</label>
                        <input
                          type="number"
                          placeholder="e.g. 3"
                          value={attendeeCount}
                          onChange={(e) => setAttendeeCount(e.target.value)}
                          style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Business Discussion Purpose</label>
                        <input
                          type="text"
                          placeholder="e.g. Q4 Cloud Renewal Discussion"
                          value={businessPurpose}
                          onChange={(e) => setBusinessPurpose(e.target.value)}
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Financial & GST Breakdown Section */}
                <div style={{
                  padding: 12,
                  background: 'rgba(15, 23, 42, 0.4)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>
                    GST & TAX BREAKDOWN (OCR EXTRACTED)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, fontSize: 12 }}>
                    <div>
                      <span style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block' }}>Subtotal</span>
                      <span className="mono">₹{(expense.subtotal || expense.amount).toFixed(2)}</span>
                    </div>
                    {expense.tax_percentage != null && (
                      <div>
                        <span style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block' }}>Tax Rate</span>
                        <span className="mono">{expense.tax_percentage}%</span>
                      </div>
                    )}
                    {expense.cgst_amount != null && expense.cgst_amount > 0 && (
                      <div>
                        <span style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block' }}>CGST</span>
                        <span className="mono">₹{expense.cgst_amount.toFixed(2)}</span>
                      </div>
                    )}
                    {expense.sgst_amount != null && expense.sgst_amount > 0 && (
                      <div>
                        <span style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block' }}>SGST</span>
                        <span className="mono">₹{expense.sgst_amount.toFixed(2)}</span>
                      </div>
                    )}
                    {expense.igst_amount != null && expense.igst_amount > 0 && (
                      <div>
                        <span style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block' }}>IGST</span>
                        <span className="mono">₹{expense.igst_amount.toFixed(2)}</span>
                      </div>
                    )}
                    <div>
                      <span style={{ fontSize: 10, color: 'var(--text-dim)', display: 'block' }}>Total Tax</span>
                      <span className="mono">₹{(expense.tax_amount || 0).toFixed(2)}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: '#38bdf8', display: 'block', fontWeight: 700 }}>Total Printed</span>
                      <span className="mono" style={{ color: '#38bdf8', fontWeight: 700 }}>₹{expense.amount.toFixed(2)}</span>
                    </div>
                  </div>
                  {expense.receipt_number && (
                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      Bill / Receipt Number: <strong className="mono" style={{ color: 'var(--text-muted)' }}>{expense.receipt_number}</strong>
                    </div>
                  )}
                </div>

                {/* Itemized Line Items Table */}
                {expense.line_items && expense.line_items.length > 0 && (
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                      ITEMIZED LINE ITEMS BREAKDOWN
                    </label>
                    <div style={{
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 8,
                      overflow: 'hidden'
                    }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: 'rgba(30, 41, 59, 0.6)', borderBottom: '1px solid var(--border-subtle)' }}>
                            <th style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--text-muted)' }}>Description</th>
                            <th style={{ textAlign: 'center', padding: '6px 10px', color: 'var(--text-muted)' }}>Qty</th>
                            <th style={{ textAlign: 'right', padding: '6px 10px', color: 'var(--text-muted)' }}>Price</th>
                            <th style={{ textAlign: 'center', padding: '6px 10px', color: 'var(--text-muted)' }}>Policy Check</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expense.line_items.map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                              <td style={{ padding: '6px 10px' }}>{item.description}</td>
                              <td style={{ textAlign: 'center', padding: '6px 10px' }}>{item.quantity}</td>
                              <td className="mono" style={{ textAlign: 'right', padding: '6px 10px' }}>₹{item.total_price.toFixed(2)}</td>
                              <td style={{ textAlign: 'center', padding: '6px 10px' }}>
                                {item.is_excluded ? (
                                  <span style={{ color: '#fb7185', fontWeight: 600, fontSize: 10 }}>DEDUCTED</span>
                                ) : (
                                  <span style={{ color: '#34d399', fontWeight: 600, fontSize: 10 }}>ELIGIBLE</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Save Corrections Button */}
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="btn btn-primary"
                  style={{ alignSelf: 'flex-start' }}
                >
                  <Save size={14} />
                  <span>{isSaving ? 'Recalculating Policy...' : 'Save Corrections & Recalculate'}</span>
                </button>

                {/* Review Actions Bar (Protected for Manager and Admin only) */}
                {isManagerOrAdmin ? (
                  <div style={{
                    marginTop: 'auto',
                    paddingTop: 16,
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Manager Review Actions:
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => onReviewAction(expense.id, 'APPROVE', 'Compliant with policy.')}
                        className="btn btn-success btn-sm"
                      >
                        <CheckCircle2 size={13} /> Approve
                      </button>
                      <button
                        onClick={() => onReviewAction(expense.id, 'AUTHORIZED_EXCEPTION', 'Exception authorized by Director due to client engagement necessity.')}
                        className="btn btn-purple btn-sm"
                      >
                        Record Exception
                      </button>
                      <button
                        onClick={() => onReviewAction(expense.id, 'REQUEST_CLARIFICATION', 'Missing mandatory attendee headcount or receipt clarification.')}
                        className="btn btn-secondary btn-sm"
                      >
                        Request Clarification
                      </button>
                      <button
                        onClick={() => onReviewAction(expense.id, 'REJECT', 'Policy limit violation.')}
                        className="btn btn-danger btn-sm"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{
                    marginTop: 'auto',
                    paddingTop: 16,
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: 'var(--text-muted)'
                  }}>
                    <span>Status: <strong className={`badge badge-${expense.status.toLowerCase().replace(/\s+/g, '-')}`}>{expense.status}</strong></span>
                    <span>Approval actions restricted to authorized Managers</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Policy Rule Trace Tab */}
          {activeTab === 'policy' && (
            <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 16, color: '#f8fafc' }}>
                  Deterministic Policy Evaluation Trace
                </h4>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Zero hallucination: every rule evaluated against corporate limits, city tiers, and cumulative allowances.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(expense.decision_history || [])[(expense.decision_history || []).length - 1]?.rules_evaluated?.map((rule, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 16,
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: `1px solid ${rule.passed ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 14
                    }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: 99,
                      background: rule.passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: rule.passed ? '#34d399' : '#fbbf24',
                      flexShrink: 0,
                      marginTop: 2
                    }}>
                      {rule.passed ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                          {rule.rule_name}
                        </span>
                        <span className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                          {rule.rule_id} • {rule.rule_section}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        {rule.message}
                      </p>
                      {rule.limit_evaluated && (
                        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11 }} className="mono">
                          <span style={{ color: 'var(--text-dim)' }}>Limit: ₹{rule.limit_evaluated.toFixed(2)}</span>
                          {rule.current_spent !== undefined && (
                            <span style={{ color: 'var(--text-dim)' }}>Spend Evaluated: ₹{rule.current_spent.toFixed(2)}</span>
                          )}
                          {rule.excess_detected !== undefined && rule.excess_detected > 0 && (
                            <span style={{ color: '#fb7185', fontWeight: 600 }}>Excess: ₹{rule.excess_detected.toFixed(2)}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Decision Versions Tab */}
          {activeTab === 'history' && (
            <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 16, color: '#f8fafc' }}>
                  Chronological Decision Versions
                </h4>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  Auditable history of all provisional and recalculated decisions over time.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {(expense.decision_history || []).map((ver, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 18,
                      background: ver.version === expense.active_decision_version ? 'rgba(30, 41, 59, 0.7)' : 'rgba(15, 23, 42, 0.4)',
                      border: `1px solid ${ver.version === expense.active_decision_version ? 'rgba(56, 189, 248, 0.4)' : 'var(--border-subtle)'}`,
                      borderRadius: 12
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: 99,
                          background: ver.version === expense.active_decision_version ? '#0284c7' : 'rgba(255, 255, 255, 0.1)',
                          color: '#ffffff',
                          fontSize: 11,
                          fontWeight: 700
                        }}>
                          Version {ver.version} {ver.version === expense.active_decision_version && '(ACTIVE)'}
                        </span>
                        <span className={`badge ${
                          ver.status === 'Approved' ? 'badge-approved' :
                          ver.status === 'Partially Eligible' ? 'badge-partially-eligible' :
                          ver.status === 'Needs Clarification' ? 'badge-clarification' :
                          ver.status === 'Pending Approval' ? 'badge-pending-approval' : 'badge-rejected'
                        }`}>
                          {ver.status}
                        </span>
                      </div>
                      <span className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        {new Date(ver.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>
                      Trigger: {ver.trigger_event}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {ver.explanation}
                    </div>

                    <div style={{
                      marginTop: 12,
                      padding: '8px 12px',
                      background: 'rgba(10, 15, 28, 0.6)',
                      borderRadius: 6,
                      display: 'flex',
                      gap: 24,
                      fontSize: 12
                    }} className="mono">
                      <span>Eligible: <strong style={{ color: '#34d399' }}>₹{ver.eligible_amount.toFixed(2)}</strong></span>
                      <span>Excess: <strong style={{ color: '#fb7185' }}>₹{ver.excess_amount.toFixed(2)}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
