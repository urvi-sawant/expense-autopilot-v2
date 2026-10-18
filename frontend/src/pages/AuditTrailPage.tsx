import React, { useState, useEffect } from 'react';
import {
  History, Shield, Search, ArrowRight, User, Terminal
} from 'lucide-react';
import { api } from '../api/client';
import { AuditEvent } from '../types';

export const AuditTrailPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const data = await api.getAuditTrail();
      setEvents(data);
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = events.filter((ev) => {
    return (
      search === '' ||
      ev.action.toLowerCase().includes(search.toLowerCase()) ||
      ev.actor_name.toLowerCase().includes(search.toLowerCase()) ||
      ev.target_id.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.7) 100%)',
        border: '1px solid var(--border-medium)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <History size={16} color="#38bdf8" />
          <span style={{ fontSize: 13, color: '#38bdf8', fontWeight: 600 }}>
            Immutable Compliance Ledger
          </span>
        </div>
        <h2 style={{ fontSize: 24, color: '#f8fafc' }}>
          Audit Trail & Governance Log
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 750, marginTop: 4 }}>
          Every decision, recalculation trigger, reviewer adjudication, and policy waiver produces a tamper-evident audit record.
        </p>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, color: '#f8fafc' }}>
            Recorded Governance Events ({filtered.length})
          </h3>
          <input
            type="text"
            placeholder="Search by action, actor, or target ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 280 }}
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(30, 41, 59, 0.5)', borderBottom: '1px solid var(--border-subtle)' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--text-muted)' }}>Timestamp</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--text-muted)' }}>Actor</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--text-muted)' }}>Action</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--text-muted)' }}>Target</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--text-muted)' }}>Audit Details</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ev) => (
                <tr key={ev.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td className="mono" style={{ padding: '10px 14px', color: 'var(--text-dim)', fontSize: 11 }}>
                    {ev.timestamp}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#f8fafc' }}>
                    {ev.actor_name}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      background:
                        ev.action.includes('RECALCULATED') ? 'rgba(168, 85, 247, 0.2)' :
                        ev.action.includes('APPROVED') ? 'rgba(16, 185, 129, 0.2)' :
                        ev.action.includes('REJECTED') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                      color:
                        ev.action.includes('RECALCULATED') ? '#c084fc' :
                        ev.action.includes('APPROVED') ? '#34d399' :
                        ev.action.includes('REJECTED') ? '#fb7185' : '#38bdf8'
                    }}>
                      {ev.action}
                    </span>
                  </td>
                  <td className="mono" style={{ padding: '10px 14px', color: '#38bdf8' }}>
                    {ev.target_type}: {ev.target_id}
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 12 }}>
                    {JSON.stringify(ev.details).slice(0, 100)}...
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
