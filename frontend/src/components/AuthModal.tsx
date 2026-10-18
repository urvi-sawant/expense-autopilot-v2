import React, { useState } from 'react';
import {
  X, Lock, Mail, User, Shield, KeyRound, CheckCircle2,
  AlertTriangle, ArrowRight, Sparkles, Building
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, quickDemoLogin, forgotPassword, resetPassword } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'employee' | 'finance' | 'admin'>('employee');
  const [department, setDepartment] = useState('Enterprise Sales');

  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register(name, email, password, role, department);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await forgotPassword(email);
      setSuccessMsg(res.message);
      if (res.reset_token) {
        setResetToken(res.reset_token);
        setMode('reset');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate reset link.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await resetPassword(resetToken, newPassword);
      setSuccessMsg('Password updated! You can now sign in.');
      setMode('login');
    } catch (err: any) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async (targetRole: 'employee' | 'finance' | 'admin') => {
    setIsSubmitting(true);
    setError(null);
    try {
      await quickDemoLogin(targetRole);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to switch demo account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.4)',
      backdropFilter: 'blur(6px)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20
    }}>
      <div style={{
        background: '#ffffff',
        border: '1px solid #ddd6fe',
        borderRadius: 16,
        boxShadow: '0 20px 40px -10px rgba(109, 40, 217, 0.15)',
        width: '100%',
        maxWidth: 480,
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #ede9fe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fbfbfe'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#ede9fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7c3aed'
            }}>
              <Shield size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, color: '#0f172a' }}>
                {mode === 'login' ? 'Sign In to Expense Autopilot' :
                 mode === 'register' ? 'Create Corporate Account' :
                 mode === 'forgot' ? 'Reset Password' : 'Set New Password'}
              </h3>
              <p style={{ fontSize: 11, color: '#64748b' }}>
                Role-based access for Employees, Finance, and Admins
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: 4
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Demo Switcher Section */}
        <div style={{
          padding: '12px 24px',
          background: '#fdf6e2',
          borderBottom: '1px solid #fde68a',
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#92400e' }}>
            <Sparkles size={13} color="#d97706" />
            <span>ONE-CLICK DEMO ACCESS (NO PASSWORD REQUIRED):</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <button
              onClick={() => handleQuickDemo('employee')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 11, padding: '6px 4px', background: '#ffffff', borderColor: '#c4b5fd' }}
            >
              👤 Employee (Priya)
            </button>
            <button
              onClick={() => handleQuickDemo('finance')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 11, padding: '6px 4px', background: '#ffffff', borderColor: '#c4b5fd' }}
            >
              💼 Finance Approver
            </button>
            <button
              onClick={() => handleQuickDemo('admin')}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 11, padding: '6px 4px', background: '#ffffff', borderColor: '#c4b5fd' }}
            >
              🛡️ System Admin
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: '24px' }}>
          {error && (
            <div style={{
              padding: '10px 14px',
              background: '#ffe4e6',
              border: '1px solid #fecdd3',
              borderRadius: 8,
              color: '#9f1239',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16
            }}>
              <AlertTriangle size={15} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              padding: '10px 14px',
              background: '#d1fae5',
              border: '1px solid #a7f3d0',
              borderRadius: 8,
              color: '#065f46',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 16
            }}>
              <CheckCircle2 size={15} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#334155', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Corporate Email Address
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Mail size={15} color="#94a3b8" style={{ position: 'absolute', left: 10 }} />
                  <input
                    type="email"
                    required
                    placeholder="name@acmecorp.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', paddingLeft: 34 }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ fontSize: 12, color: '#334155', fontWeight: 600 }}>Password</label>
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); }}
                    style={{ background: 'none', border: 'none', fontSize: 11, color: '#7c3aed', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={15} color="#94a3b8" style={{ position: 'absolute', left: 10 }} />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '100%', paddingLeft: 34 }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ marginTop: 6, width: '100%', padding: '10px' }}
              >
                <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Workspace'}</span>
                <ArrowRight size={14} />
              </button>

              <div style={{ textAlign: 'center', fontSize: 12, color: '#64748b', marginTop: 10 }}>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(null); }}
                  style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontWeight: 700 }}
                >
                  Register Employee Account
                </button>
              </div>
            </form>
          )}

          {/* Registration Form */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#334155', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Full Name
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <User size={15} color="#94a3b8" style={{ position: 'absolute', left: 10 }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priya Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ width: '100%', paddingLeft: 34 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#334155', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Corporate Email
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Mail size={15} color="#94a3b8" style={{ position: 'absolute', left: 10 }} />
                  <input
                    type="email"
                    required
                    placeholder="name@acmecorp.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%', paddingLeft: 34 }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#334155', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Role Assignment
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    style={{ width: '100%' }}
                  >
                    <option value="employee">Employee</option>
                    <option value="finance">Finance Approver</option>
                    <option value="admin">System Administrator</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, color: '#334155', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#334155', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Password
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={15} color="#94a3b8" style={{ position: 'absolute', left: 10 }} />
                  <input
                    type="password"
                    required
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: '100%', paddingLeft: 34 }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ marginTop: 6, width: '100%', padding: '10px' }}
              >
                <span>{isSubmitting ? 'Creating Account...' : 'Complete Registration'}</span>
                <ArrowRight size={14} />
              </button>

              <div style={{ textAlign: 'center', fontSize: 12, color: '#64748b', marginTop: 10 }}>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontWeight: 700 }}
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {/* Forgot Password Request */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
                Enter your registered corporate email to receive a password reset token.
              </p>
              <div>
                <label style={{ fontSize: 12, color: '#334155', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@acmecorp.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ width: '100%', padding: '10px' }}
              >
                <span>Generate Reset Token</span>
              </button>

              <div style={{ textAlign: 'center', fontSize: 12, color: '#64748b' }}>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer' }}
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* Reset Password Confirm */}
          {mode === 'reset' && (
            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: '#334155', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  Reset Token
                </label>
                <input
                  type="text"
                  required
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  style={{ width: '100%', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: '#334155', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ width: '100%', padding: '10px' }}
              >
                <span>Save New Password</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
