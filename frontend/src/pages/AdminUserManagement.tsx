import React, { useState, useEffect } from 'react';
import {
  Users, UserCheck, Shield, UserPlus, Edit2, Save, X,
  CheckCircle2, AlertTriangle, KeyRound
} from 'lucide-react';
import { api } from '../api/client';
import { User } from '../types';

export const AdminUserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<'employee' | 'manager' | 'finance' | 'admin'>('employee');
  const [editDepartment, setEditDepartment] = useState('');
  const [editActive, setEditActive] = useState(true);

  // New User Form State
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('Password123!');
  const [newRole, setNewRole] = useState<'employee' | 'manager' | 'finance' | 'admin'>('employee');
  const [newDepartment, setNewDepartment] = useState('Operations');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed loading users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleStartEdit = (user: User) => {
    setEditingUserId(user.id);
    setEditRole(user.role);
    setEditDepartment(user.department);
    setEditActive(user.is_active);
  };

  const handleSaveEdit = async (userId: string) => {
    try {
      await api.updateUser(userId, {
        role: editRole,
        department: editDepartment,
        is_active: editActive
      });
      setEditingUserId(null);
      setSuccess('User permissions updated successfully.');
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed updating user');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.register(newName, newEmail, newPassword, newRole, newDepartment);
      setIsAdding(false);
      setNewName('');
      setNewEmail('');
      setSuccess('New user created successfully.');
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed creating user');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{
        padding: '24px 28px',
        background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(255, 255, 255, 1) 100%)',
        border: '1px solid #c4b5fd'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Users size={16} color="#7c3aed" />
              <span style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600 }}>
                Enterprise Administration
              </span>
            </div>
            <h2 style={{ fontSize: 24, color: '#0f172a' }}>
              User & Role-Based Access Governance
            </h2>
            <p style={{ fontSize: 13, color: '#64748b', maxWidth: 750, marginTop: 4 }}>
              Manage corporate users, configure role-based data isolation (Employee vs Finance Approver vs System Admin), and track account activity.
            </p>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <UserPlus size={15} />
            <span>{isAdding ? 'Close Form' : 'Add New User'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#ffe4e6', border: '1px solid #fecdd3', borderRadius: 8, color: '#9f1239', fontSize: 13 }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{ padding: '12px 16px', background: '#d1fae5', border: '1px solid #a7f3d0', borderRadius: 8, color: '#065f46', fontSize: 13 }}>
          {success}
        </div>
      )}

      {/* Add User Drawer */}
      {isAdding && (
        <form onSubmit={handleCreateUser} className="glass-panel" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h3 style={{ fontSize: 15, color: '#0f172a' }}>Provision New User</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>FULL NAME</label>
              <input
                type="text"
                required
                placeholder="e.g. Vikram Malhotra"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>EMAIL</label>
              <input
                type="email"
                required
                placeholder="vikram@acmecorp.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>ROLE</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as any)}
                style={{ width: '100%', marginTop: 4 }}
              >
                <option value="employee">Employee (Own claims only)</option>
                <option value="manager">Manager / Approver (Approvals queue & decisions)</option>
                <option value="finance">Finance Auditor (Policy & audit review)</option>
                <option value="admin">System Admin (Full governance)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>DEPARTMENT</label>
              <input
                type="text"
                value={newDepartment}
                onChange={(e) => setNewDepartment(e.target.value)}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={() => setIsAdding(false)} className="btn btn-secondary btn-sm">Cancel</button>
            <button type="submit" className="btn btn-primary btn-sm">Provision User</button>
          </div>
        </form>
      )}

      {/* Users Table */}
      <div className="glass-panel" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 16, color: '#0f172a', marginBottom: 16 }}>
          Registered Organization Accounts ({users.length})
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#fbfbfe', borderBottom: '1px solid #ede9fe' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: '#64748b' }}>User</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: '#64748b' }}>Email</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: '#64748b' }}>Role</th>
                <th style={{ textAlign: 'left', padding: '10px 14px', color: '#64748b' }}>Department</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', color: '#64748b' }}>Status</th>
                <th style={{ textAlign: 'center', padding: '10px 14px', color: '#64748b' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isEditing = editingUserId === u.id;

                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid #ede9fe' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>
                      {u.name}
                      {u.employee_id && (
                        <span className="mono" style={{ fontSize: 11, color: '#7c3aed', marginLeft: 8 }}>
                          ({u.employee_id})
                        </span>
                      )}
                    </td>
                    <td className="mono" style={{ padding: '12px 14px', color: '#475569', fontSize: 12 }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {isEditing ? (
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as any)}
                        >
                          <option value="employee">Employee</option>
                          <option value="manager">Manager / Approver</option>
                          <option value="finance">Finance Auditor</option>
                          <option value="admin">System Admin</option>
                        </select>
                      ) : (
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: 99,
                          fontSize: 11,
                          fontWeight: 700,
                          background:
                            u.role === 'admin' ? '#fef3c7' :
                            u.role === 'manager' ? '#ede9fe' :
                            u.role === 'finance' ? '#e0f2fe' : '#f1f5f9',
                          color:
                            u.role === 'admin' ? '#92400e' :
                            u.role === 'manager' ? '#6d28d9' :
                            u.role === 'finance' ? '#0369a1' : '#334155',
                          border: `1px solid ${
                            u.role === 'admin' ? '#fde68a' :
                            u.role === 'manager' ? '#c4b5fd' :
                            u.role === 'finance' ? '#bae6fd' : '#cbd5e1'
                          }`
                        }}>
                          {u.role.toUpperCase()}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editDepartment}
                          onChange={(e) => setEditDepartment(e.target.value)}
                        />
                      ) : (
                        u.department
                      )}
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px 14px' }}>
                      {isEditing ? (
                        <input
                          type="checkbox"
                          checked={editActive}
                          onChange={(e) => setEditActive(e.target.checked)}
                        />
                      ) : (
                        <span className={`badge ${u.is_active ? 'badge-approved' : 'badge-rejected'}`}>
                          {u.is_active ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', padding: '12px 14px' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                          <button
                            onClick={() => handleSaveEdit(u.id)}
                            className="btn btn-primary btn-sm"
                            style={{ padding: '3px 8px' }}
                          >
                            <Save size={13} />
                          </button>
                          <button
                            onClick={() => setEditingUserId(null)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px' }}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(u)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '3px 8px' }}
                        >
                          <Edit2 size={13} /> Edit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
