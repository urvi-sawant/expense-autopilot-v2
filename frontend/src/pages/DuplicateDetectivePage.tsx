import React, { useState, useEffect } from 'react';
import {
  CopyCheck, AlertTriangle, CheckCircle2, ShieldCheck,
  Eye, GitFork, ArrowRight, Share2, Layers, Filter
} from 'lucide-react';
import { api } from '../api/client';
import { DuplicateCandidate, Expense } from '../types';

interface DuplicateDetectivePageProps {
  duplicates: DuplicateCandidate[];
  expenses: Expense[];
  onSelectExpense: (exp: Expense) => void;
  onRefreshAll: () => Promise<void>;
}

export const DuplicateDetectivePage: React.FC<DuplicateDetectivePageProps> = ({
  duplicates,
  expenses,
  onSelectExpense,
  onRefreshAll
}) => {
  const [evidenceGraph, setEvidenceGraph] = useState<any>(null);
  const [activeView, setActiveView] = useState<'candidates' | 'graph'>('candidates');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionDisposition, setResolutionDisposition] = useState('Confirmed Duplicate');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadGraph();
  }, []);

  const loadGraph = async () => {
    try {
      const data = await api.getEvidenceGraph();
      setEvidenceGraph(data);
    } catch (err) {
      console.error('Error loading graph:', err);
    }
  };

  const handleResolve = async (dupId: string) => {
    setIsSubmitting(true);
    try {
      await api.resolveDuplicate(dupId, resolutionDisposition, resolutionNotes || 'Adjudicated by auditor');
      setResolvingId(null);
      setResolutionNotes('');
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
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(30, 41, 59, 0.6) 100%)',
        border: '1px solid rgba(239, 68, 68, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <CopyCheck size={16} color="#f87171" />
          <span style={{ fontSize: 13, color: '#f87171', fontWeight: 600 }}>
            Fraud & Leakage Prevention
          </span>
        </div>
        <h2 style={{ fontSize: 24, color: '#f8fafc' }}>
          Duplicate Detective & Evidence Graph
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 750, marginTop: 4 }}>
          Multi-factor similarity engine matching perceptual image hashes (dHash), invoice identifiers, item descriptions, and temporal clusters. Visualizes multi-dimensional relationships across trips, employees, and merchants.
        </p>

        {/* View Switcher Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            onClick={() => setActiveView('candidates')}
            className={`btn btn-sm ${activeView === 'candidates' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Duplicate Candidates ({duplicates.length})
          </button>
          <button
            onClick={() => setActiveView('graph')}
            className={`btn btn-sm ${activeView === 'graph' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Share2 size={13} /> Interactive Evidence Graph
          </button>
        </div>
      </div>

      {/* Main View Content */}
      {activeView === 'candidates' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {duplicates.map((dup) => {
            const exp1 = expenses.find((e) => e.id === dup.expense_id_primary);
            const exp2 = expenses.find((e) => e.id === dup.expense_id_secondary);

            return (
              <div
                key={dup.id}
                className="glass-panel"
                style={{
                  padding: 22,
                  border: `1px solid ${dup.similarity_score >= 80 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: 99,
                      background: dup.similarity_score >= 80 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                      color: dup.similarity_score >= 80 ? '#f87171' : '#fbbf24',
                      fontSize: 12,
                      fontWeight: 700
                    }}>
                      {dup.similarity_score}% SIMILARITY • {dup.classification}
                    </span>
                    <span className="mono" style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                      {dup.id}
                    </span>
                  </div>

                  {dup.resolved ? (
                    <span className="badge badge-approved">
                      Resolved: {dup.resolution_disposition}
                    </span>
                  ) : (
                    <button
                      onClick={() => setResolvingId(dup.id)}
                      className="btn btn-secondary btn-sm"
                    >
                      Resolve Match
                    </button>
                  )}
                </div>

                {/* Match Factors Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                  {dup.match_factors.map((factor, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '3px 8px',
                        background: 'rgba(15, 23, 42, 0.6)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: 6,
                        fontSize: 11,
                        color: '#f8fafc'
                      }}
                    >
                      ✓ {factor}
                    </span>
                  ))}
                </div>

                {/* Side-by-Side Expense Comparison */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {/* Primary Expense */}
                  <div style={{
                    padding: 14,
                    background: 'rgba(15, 23, 42, 0.5)',
                    borderRadius: 8,
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>PRIMARY SUBMISSION</span>
                      <span className="mono" style={{ fontSize: 11, color: '#38bdf8' }}>#{exp1?.id}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>{exp1?.merchant}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{exp1?.date} • {exp1?.employee_id}</div>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: '#34d399', marginTop: 8 }}>
                      ₹{exp1?.amount_inr?.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                      Doc #: {exp1?.receipt_number || 'N/A'}
                    </div>
                  </div>

                  {/* Secondary Conflict Expense */}
                  <div style={{
                    padding: 14,
                    background: 'rgba(15, 23, 42, 0.5)',
                    borderRadius: 8,
                    border: '1px solid var(--border-subtle)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>CONFLICT SUBMISSION</span>
                      <span className="mono" style={{ fontSize: 11, color: '#fb7185' }}>#{exp2?.id}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>{exp2?.merchant}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{exp2?.date} • {exp2?.employee_id}</div>
                    <div className="mono" style={{ fontSize: 16, fontWeight: 700, color: '#fb7185', marginTop: 8 }}>
                      ₹{exp2?.amount_inr?.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                      Doc #: {exp2?.receipt_number || 'N/A'}
                    </div>
                  </div>
                </div>

                {/* Resolution Drawer */}
                {resolvingId === dup.id && (
                  <div style={{
                    marginTop: 16,
                    padding: 16,
                    background: 'rgba(30, 41, 59, 0.6)',
                    borderRadius: 8,
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#f8fafc' }}>
                      Adjudicate Duplicate Conflict
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                      <select
                        value={resolutionDisposition}
                        onChange={(e) => setResolutionDisposition(e.target.value)}
                      >
                        <option value="Confirmed Duplicate">Confirmed Duplicate (Reject 2nd Claim)</option>
                        <option value="Split Bill">Legitimate Split Bill / Shared Meal</option>
                        <option value="False Positive">False Positive (Independent Transactions)</option>
                      </select>

                      <input
                        type="text"
                        placeholder="Add justification notes for compliance audit log..."
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-end' }}>
                      <button
                        onClick={() => setResolvingId(null)}
                        className="btn btn-secondary btn-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleResolve(dup.id)}
                        disabled={isSubmitting}
                        className="btn btn-primary btn-sm"
                      >
                        Confirm Adjudication
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Interactive Evidence Graph View */
        <div className="glass-panel" style={{ padding: 24 }}>
          <h3 style={{ fontSize: 17, color: '#f8fafc', marginBottom: 8 }}>
            Multi-Dimensional Evidence Graph
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
            Visualizes connections between employees, business trips, merchants, and duplicate conflict links.
          </p>

          <div style={{
            background: '#070b14',
            borderRadius: 12,
            border: '1px solid var(--border-subtle)',
            padding: 24,
            minHeight: 480,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 20, fontSize: 11, color: 'var(--text-muted)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 99, background: '#38bdf8' }} /> Employees
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 99, background: '#818cf8' }} /> Business Trips
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 99, background: '#34d399' }} /> Approved Expenses
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: 99, background: '#fb7185' }} /> Duplicate Conflicts
              </span>
            </div>

            {/* Render Network Graph Nodes Representation */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
              margin: '24px 0'
            }}>
              {evidenceGraph?.nodes?.slice(0, 8).map((node: any, idx: number) => (
                <div
                  key={idx}
                  style={{
                    padding: 14,
                    background: 'rgba(15, 23, 42, 0.7)',
                    borderRadius: 8,
                    border: `1px solid ${
                      node.type === 'Employee' ? 'rgba(56, 189, 248, 0.4)' :
                      node.type === 'Trip' ? 'rgba(129, 140, 248, 0.4)' :
                      node.type === 'Expense' ? 'rgba(52, 211, 153, 0.4)' : 'rgba(255, 255, 255, 0.1)'
                    }`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                      {node.type}
                    </span>
                    <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{node.id}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f8fafc' }}>
                    {node.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {node.details}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
              Connected {evidenceGraph?.nodes?.length || 0} relational nodes across {evidenceGraph?.links?.length || 0} entity links.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
