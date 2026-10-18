import React, { useState, useEffect } from 'react';
import {
  Sliders, Shield, CheckCircle2, FileText, Edit2, Save,
  AlertTriangle, Plus, Check, X
} from 'lucide-react';
import { api } from '../api/client';
import { PolicyRule } from '../types';

interface PolicyStudioPageProps {
  onRefreshAll: () => Promise<void>;
}

export const PolicyStudioPage: React.FC<PolicyStudioPageProps> = ({ onRefreshAll }) => {
  const [rules, setRules] = useState<PolicyRule[]>([]);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editLimit, setEditLimit] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const data = await api.getPolicyRules();
      setRules(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartEdit = (rule: PolicyRule) => {
    setEditingRuleId(rule.rule_id);
    setEditLimit(rule.limit_amount);
  };

  const handleSaveEdit = async (ruleId: string) => {
    setIsSaving(true);
    try {
      await api.updatePolicyRule(ruleId, { limit_amount: editLimit });
      setEditingRuleId(null);
      await loadRules();
      await onRefreshAll();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (rule: PolicyRule) => {
    try {
      await api.updatePolicyRule(rule.rule_id, { active: !rule.active });
      await loadRules();
      await onRefreshAll();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(30, 41, 59, 0.6) 100%)',
        border: '1px solid rgba(59, 130, 246, 0.3)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Sliders size={16} color="#38bdf8" />
          <span style={{ fontSize: 13, color: '#38bdf8', fontWeight: 600 }}>
            Policy Intelligence & Governance
          </span>
        </div>
        <h2 style={{ fontSize: 24, color: '#f8fafc' }}>
          Corporate Policy Studio
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 750, marginTop: 4 }}>
          Deterministic, zero-hallucination rule definitions. Policy rules are version-tracked, auditable, and drive all calculations across the Expense Time Machine.
        </p>
      </div>

      {/* Rules Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        {rules.map((rule) => {
          const isEditing = editingRuleId === rule.rule_id;

          return (
            <div
              key={rule.rule_id}
              className="glass-panel"
              style={{
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                opacity: rule.active ? 1 : 0.5,
                border: `1px solid ${rule.active ? 'var(--border-subtle)' : 'rgba(255, 255, 255, 0.04)'}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="mono" style={{ fontSize: 11, color: '#38bdf8', fontWeight: 600 }}>
                  {rule.rule_id}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    onClick={() => handleToggleActive(rule)}
                    style={{
                      background: rule.active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                      color: rule.active ? '#34d399' : 'var(--text-muted)',
                      border: 'none',
                      borderRadius: 99,
                      padding: '2px 8px',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {rule.active ? 'ACTIVE' : 'DISABLED'}
                  </button>
                  <button
                    onClick={() => handleStartEdit(rule)}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '3px 8px' }}
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: 15, color: '#f8fafc' }}>{rule.name}</h4>
                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                  {rule.source_section}
                </div>
              </div>

              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {rule.description}
              </p>

              {/* Limit Display or Edit */}
              <div style={{
                marginTop: 'auto',
                padding: 12,
                background: 'rgba(15, 23, 42, 0.6)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Configured Limit:</span>
                {isEditing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <input
                      type="number"
                      value={editLimit}
                      onChange={(e) => setEditLimit(parseFloat(e.target.value) || 0)}
                      style={{ width: 90, padding: '2px 6px', fontFamily: 'var(--font-mono)' }}
                    />
                    <button
                      onClick={() => handleSaveEdit(rule.rule_id)}
                      disabled={isSaving}
                      className="btn btn-primary btn-sm"
                      style={{ padding: '4px 8px' }}
                    >
                      <Save size={12} />
                    </button>
                  </div>
                ) : (
                  <span className="mono" style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>
                    {rule.limit_amount > 0 ? `₹${rule.limit_amount.toFixed(2)}` : 'Prohibited (₹0.00)'}
                  </span>
                )}
              </div>

              {/* Badges for Excluded Items & Requirements */}
              {rule.excluded_items && rule.excluded_items.length > 0 && (
                <div style={{ fontSize: 11, color: '#fb7185' }}>
                  Excluded Goods: {rule.excluded_items.join(', ')}
                </div>
              )}
              {rule.required_fields && rule.required_fields.length > 0 && (
                <div style={{ fontSize: 11, color: '#38bdf8' }}>
                  Mandatory Fields: {rule.required_fields.join(', ')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
