import React, { useState } from 'react';
import {
  Sparkles, Lock, Mail, User as UserIcon, Shield, KeyRound,
  CheckCircle2, AlertTriangle, ArrowRight, Eye, EyeOff, Building,
  Award, HelpCircle, Layers, Clock, ShieldAlert, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, register, quickDemoLogin, forgotPassword, resetPassword } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regDepartment, setRegDepartment] = useState('Enterprise Sales');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Forgot / Reset Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetStep, setResetStep] = useState<'request' | 'confirm'>('request');

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleTabChange = (tab: 'login' | 'register' | 'forgot') => {
    clearMessages();
    setActiveTab(tab);
  };

  // 1. Login Handler
  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    clearMessages();

    if (!email.trim() || !password) {
      setError('Please provide both your corporate email and password.');
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Register Handler (Always provisions Employee role)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!regName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@') || !regEmail.includes('.')) {
      setError('Please enter a valid corporate email address.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Password must contain at least 6 characters.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      // Role is always enforced as 'employee' for public registrations
      await register(regName.trim(), regEmail.trim(), regPassword, 'employee', regDepartment);
    } catch (err: any) {
      setError(err.message || 'Registration failed. An account with this email may already exist.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Forgot Password Request Handler
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!forgotEmail.trim()) {
      setError('Please enter your registered email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await forgotPassword(forgotEmail.trim());
      if (res.reset_token) {
        setResetToken(res.reset_token);
        setResetStep('confirm');
        setSuccess(`Verification token generated: ${res.reset_token}`);
      } else {
        setSuccess('If this email is registered in our corporate directory, recovery instructions have been prepared.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed generating password reset token.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Confirm Password Reset Handler
  const handleResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    clearMessages();

    if (!resetToken.trim() || !newPassword) {
      setError('Please provide the reset token and your new password.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must contain at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(resetToken.trim(), newPassword);
      setSuccess('Your password has been reset successfully! You can now sign in.');
      setActiveTab('login');
      setEmail(forgotEmail);
      setPassword('');
      setResetStep('request');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired reset token.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. One-Click Demo Login for Judges
  const handleQuickDemo = async (role: 'employee' | 'manager' | 'finance' | 'admin') => {
    clearMessages();
    setIsLoading(true);
    try {
      await quickDemoLogin(role);
    } catch (err: any) {
      setError(err.message || `Failed to authenticate as ${role} demo user.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'linear-gradient(135deg, #f8f9fa 0%, #f1f5f9 50%, #fdf6e2 100%)',
      color: '#0f172a'
    }}>
      {/* Top Header / Brand Bar */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #ddd6fe',
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 10px rgba(109, 40, 217, 0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)'
          }}>
            <Sparkles size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontSize: 19,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#0f172a'
              }}>
                EXPENSE AUTOPILOT
              </span>
              <span style={{
                fontSize: 10,
                padding: '2px 8px',
                borderRadius: 99,
                background: '#ede9fe',
                color: '#7c3aed',
                border: '1px solid #c4b5fd',
                fontWeight: 700
              }}>
                POLICY v2026.4
              </span>
            </div>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              Intelligent Context-Aware Auditing & Temporal Decision Engine
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#0369a1',
            background: '#e0f2fe',
            border: '1px solid #bae6fd',
            padding: '4px 10px',
            borderRadius: 99,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <Shield size={13} />
            Secure Enterprise Gateway
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main style={{
        flex: 1,
        maxWidth: 1280,
        width: '100%',
        margin: '0 auto',
        padding: '36px 20px 60px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 32
      }}>
        {/* Hackathon Judges Demo Notice Banner */}
        <section style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fbfbfe 100%)',
          border: '1px solid #ddd6fe',
          borderRadius: 14,
          padding: '20px 24px',
          boxShadow: '0 4px 18px rgba(109, 40, 217, 0.06)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: '#fdf6e2',
              border: '1px solid #fde68a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#92400e'
            }}>
              <Award size={18} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                Hackathon Judges & Evaluator Quick Demo
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                One-click instant access to test all role-tailored workspaces and server-side authorization boundaries:
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 14
          }}>
            {/* 1. Employee Demo */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #bae6fd',
              borderRadius: 10,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 12,
              boxShadow: '0 2px 8px rgba(3, 105, 161, 0.05)'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: '#e0f2fe',
                    color: '#0369a1',
                    border: '1px solid #bae6fd'
                  }}>
                    ROLE: EMPLOYEE
                  </span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#64748b' }}>
                    priya@acmecorp.com
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  Priya Sharma (Account Director)
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Personal workspace, receipt upload, daily allowance progress bar, and personal Time Machine claims.
                </div>
                <div style={{ fontSize: 11, color: '#0369a1', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                  Password: <strong>Password123!</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleQuickDemo('employee')}
                disabled={isLoading}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  background: '#f0f9ff',
                  borderColor: '#bae6fd',
                  color: '#0369a1',
                  fontWeight: 700
                }}
              >
                <span>Launch Employee Workspace</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* 2. Manager Approver Demo */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #c4b5fd',
              borderRadius: 10,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 12,
              boxShadow: '0 2px 8px rgba(124, 58, 237, 0.06)'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: '#ede9fe',
                    color: '#6d28d9',
                    border: '1px solid #c4b5fd'
                  }}>
                    ROLE: MANAGER / APPROVER
                  </span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#64748b' }}>
                    manager@acmecorp.com
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  Rajesh Nair (Approver)
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Approvals queue, original receipt & GST breakdown inspection, policy warning review, and sign-off / rejection authority.
                </div>
                <div style={{ fontSize: 11, color: '#6d28d9', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                  Password: <strong>Manager123!</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleQuickDemo('manager')}
                disabled={isLoading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                  borderColor: '#7c3aed',
                  fontWeight: 700
                }}
              >
                <span>Launch Approvals Dashboard</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* 3. Finance Reviewer Demo */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #ddd6fe',
              borderRadius: 10,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 12,
              boxShadow: '0 2px 8px rgba(109, 40, 217, 0.05)'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: '#ede9fe',
                    color: '#7c3aed',
                    border: '1px solid #c4b5fd'
                  }}>
                    ROLE: FINANCE APPROVER
                  </span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#64748b' }}>
                    finance@acmecorp.com
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  Finance Auditor (Reviewer)
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Audit queue, duplicate detective, behavioral risk radar, approvals queue, and Time Machine scrubber.
                </div>
                <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                  Password: <strong>Finance123!</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleQuickDemo('finance')}
                disabled={isLoading}
                className="btn btn-primary"
                style={{ width: '100%', fontWeight: 700 }}
              >
                <span>Launch Finance Dashboard</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* 3. System Administrator Demo */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #fde68a',
              borderRadius: 10,
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: 12,
              boxShadow: '0 2px 8px rgba(180, 83, 9, 0.05)'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 99,
                    background: '#fef3c7',
                    color: '#92400e',
                    border: '1px solid #fde68a'
                  }}>
                    ROLE: SYSTEM ADMIN
                  </span>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: '#64748b' }}>
                    admin@acmecorp.com
                  </span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  System Administrator (Governance)
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                  Full authority: User role assignment & governance, Policy Studio rule configuration, and full audit logs.
                </div>
                <div style={{ fontSize: 11, color: '#92400e', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                  Password: <strong>Admin123!</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleQuickDemo('admin')}
                disabled={isLoading}
                className="btn btn-secondary"
                style={{
                  width: '100%',
                  background: '#fefce8',
                  borderColor: '#fde68a',
                  color: '#92400e',
                  fontWeight: 700
                }}
              >
                <span>Launch Admin Console</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </section>

        {/* Auth Interface Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 1fr',
          gap: 32,
          alignItems: 'start'
        }}>
          {/* Left Column: Feature Highlights */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#7c3aed',
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}>
                Autonomous Enterprise Spending Intelligence
              </span>
              <h1 style={{
                fontSize: 32,
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.25,
                marginTop: 6
              }}>
                Auditing that thinks forward and backwards in time.
              </h1>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.6, marginTop: 12 }}>
                Traditional expense software only validates standalone forms. Expense Autopilot recalculates cumulative allowances chronologically, isolates visual receipt duplicates, and detects evasive spending patterns.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="glass-panel" style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: '#ede9fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#7c3aed',
                  flexShrink: 0
                }}>
                  <Clock size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                    Signature Expense Time Machine
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 1.5 }}>
                    When delayed receipts arrive out of sequence, previous decisions automatically re-evaluate with transparent version history (v1 &rarr; v2).
                  </div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: '#e0f2fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0369a1',
                  flexShrink: 0
                }}>
                  <Layers size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                    Perceptual Hash Duplicate Detective
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 1.5 }}>
                    Catches identical receipts taken from different angles using 64-bit difference hashes (`dHash`) and interactive multi-entity evidence graphs.
                  </div>
                </div>
              </div>

              <div className="glass-panel" style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: '#fef08a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#854d0e',
                  flexShrink: 0
                }}>
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                    Zero-Hallucination Deterministic Rules
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, lineHeight: 1.5 }}>
                    City-tier allowances (Mumbai Tier 1 vs Tier 2), prohibited alcohol exclusions, and mandatory client headcount checks run via verifiable deterministic logic.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Login / Register Card */}
          <div className="glass-panel" style={{
            padding: '28px 32px',
            background: '#ffffff',
            border: '1px solid #ddd6fe',
            boxShadow: '0 8px 30px rgba(109, 40, 217, 0.08)'
          }}>
            {/* Mode Selector Tabs */}
            <div style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: 4,
              borderRadius: 10,
              marginBottom: 24,
              border: '1px solid #e2e8f0'
            }}>
              <button
                type="button"
                onClick={(e) => {
                  if (activeTab === 'login') {
                    handleLoginSubmit(e);
                  } else {
                    handleTabChange('login');
                  }
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: activeTab === 'login' ? '#ffffff' : 'transparent',
                  color: activeTab === 'login' ? '#7c3aed' : '#64748b',
                  fontWeight: activeTab === 'login' ? 700 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: activeTab === 'login' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('register')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: activeTab === 'register' ? '#ffffff' : 'transparent',
                  color: activeTab === 'register' ? '#7c3aed' : '#64748b',
                  fontWeight: activeTab === 'register' ? 700 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: activeTab === 'register' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                Create Account
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('forgot')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: 'none',
                  background: activeTab === 'forgot' ? '#ffffff' : 'transparent',
                  color: activeTab === 'forgot' ? '#7c3aed' : '#64748b',
                  fontWeight: activeTab === 'forgot' ? 700 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: activeTab === 'forgot' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                Password Help
              </button>
            </div>

            {/* Error & Success Feedback Banners */}
            {error && (
              <div style={{
                padding: '12px 16px',
                background: '#ffe4e6',
                border: '1px solid #fecdd3',
                borderRadius: 8,
                color: '#9f1239',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 20
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div style={{
                padding: '12px 16px',
                background: '#d1fae5',
                border: '1px solid #a7f3d0',
                borderRadius: 8,
                color: '#065f46',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 20
              }}>
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>{success}</span>
              </div>
            )}

            {/* TAB 1: LOGIN FORM */}
            {activeTab === 'login' && (
              <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                    CORPORATE EMAIL
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
                    <input
                      type="email"
                      required
                      placeholder="e.g. priya@acmecorp.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        fontSize: 13,
                        borderRadius: 8,
                        border: '1px solid #ddd6fe',
                        background: '#ffffff',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                      PASSWORD
                    </label>
                    <button
                      type="button"
                      onClick={() => handleTabChange('forgot')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#7c3aed',
                        fontSize: 12,
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter your corporate password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 40px 10px 38px',
                        fontSize: 13,
                        borderRadius: 8,
                        border: '1px solid #ddd6fe',
                        background: '#ffffff',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: 10,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#94a3b8'
                      }}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ cursor: 'pointer', accentColor: '#7c3aed' }}
                  />
                  <label htmlFor="rememberMe" style={{ fontSize: 12, color: '#64748b', cursor: 'pointer' }}>
                    Keep me signed in across browser sessions
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary"
                  style={{
                    padding: '12px 20px',
                    fontSize: 14,
                    fontWeight: 700,
                    width: '100%',
                    marginTop: 4
                  }}
                >
                  {isLoading ? 'Verifying Credentials...' : 'Sign In'}
                </button>

                <div style={{
                  textAlign: 'center',
                  fontSize: 12,
                  color: '#64748b',
                  borderTop: '1px solid #ede9fe',
                  paddingTop: 16,
                  marginTop: 4
                }}>
                  New team member without an account?{' '}
                  <button
                    type="button"
                    onClick={() => handleTabChange('register')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#7c3aed',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Register here &rarr;
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: REGISTER FORM (Safe Role Assignment: Employee Default) */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                    FULL NAME
                  </label>
                  <div style={{ position: 'relative' }}>
                    <UserIcon size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maya Patel"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        fontSize: 13,
                        borderRadius: 8,
                        border: '1px solid #ddd6fe',
                        background: '#ffffff',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                    CORPORATE EMAIL
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
                    <input
                      type="email"
                      required
                      placeholder="e.g. maya.patel@acmecorp.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        fontSize: 13,
                        borderRadius: 8,
                        border: '1px solid #ddd6fe',
                        background: '#ffffff',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                    DEPARTMENT
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Building size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
                    <select
                      value={regDepartment}
                      onChange={(e) => setRegDepartment(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        fontSize: 13,
                        borderRadius: 8,
                        border: '1px solid #ddd6fe',
                        background: '#ffffff',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="Enterprise Sales">Enterprise Sales</option>
                      <option value="Solutions Engineering">Solutions Engineering</option>
                      <option value="Product Management">Product Management</option>
                      <option value="Operations">Operations</option>
                      <option value="Field Marketing">Field Marketing</option>
                      <option value="Executive Management">Executive Management</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                      PASSWORD
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        placeholder="Min 6 characters"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 32px 10px 12px',
                          fontSize: 13,
                          borderRadius: 8,
                          border: '1px solid #ddd6fe',
                          background: '#ffffff',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        style={{
                          position: 'absolute',
                          right: 8,
                          top: 10,
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#94a3b8'
                        }}
                      >
                        {showRegPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                      CONFIRM
                    </label>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        fontSize: 13,
                        borderRadius: 8,
                        border: '1px solid #ddd6fe',
                        background: '#ffffff',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Safe Role Notice */}
                <div style={{
                  padding: '10px 14px',
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: 8,
                  fontSize: 11,
                  color: '#0369a1',
                  lineHeight: 1.4
                }}>
                  <strong>Governance Policy:</strong> Public registrations automatically create an <strong>Employee Workspace</strong> account. Finance Auditor and Administrator privileges require authorized provisioning by a system admin.
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn btn-primary"
                  style={{
                    padding: '12px 20px',
                    fontSize: 14,
                    fontWeight: 700,
                    width: '100%',
                    marginTop: 4
                  }}
                >
                  {isLoading ? 'Creating Account...' : 'Create Employee Account'}
                </button>
              </form>
            )}

            {/* TAB 3: FORGOT / RESET PASSWORD */}
            {activeTab === 'forgot' && (
              <div>
                {resetStep === 'request' ? (
                  <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5 }}>
                      Enter your corporate email address. A cryptographic verification token will be generated to securely update your credentials.
                    </p>

                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                        REGISTERED EMAIL
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Mail size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
                        <input
                          type="email"
                          required
                          placeholder="e.g. priya@acmecorp.com"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px 10px 38px',
                            fontSize: 13,
                            borderRadius: 8,
                            border: '1px solid #ddd6fe',
                            background: '#ffffff',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn btn-primary"
                      style={{ padding: '11px 18px', fontWeight: 700 }}
                    >
                      {isLoading ? 'Generating Token...' : 'Generate Reset Token'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() => setResetStep('confirm')}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#64748b',
                          fontSize: 12,
                          textDecoration: 'underline',
                          cursor: 'pointer'
                        }}
                      >
                        Already have a reset token? Enter it here &rarr;
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleResetConfirm} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                        RESET TOKEN
                      </label>
                      <div style={{ position: 'relative' }}>
                        <KeyRound size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
                        <input
                          type="text"
                          required
                          placeholder="Paste cryptographic reset token"
                          value={resetToken}
                          onChange={(e) => setResetToken(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px 10px 38px',
                            fontSize: 13,
                            fontFamily: 'var(--font-mono)',
                            borderRadius: 8,
                            border: '1px solid #ddd6fe',
                            background: '#ffffff',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                        NEW PASSWORD
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Lock size={16} color="#94a3b8" style={{ position: 'absolute', left: 12, top: 12 }} />
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          placeholder="Min 6 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 40px 10px 38px',
                            fontSize: 13,
                            borderRadius: 8,
                            border: '1px solid #ddd6fe',
                            background: '#ffffff',
                            outline: 'none'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          style={{
                            position: 'absolute',
                            right: 12,
                            top: 10,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#94a3b8'
                          }}
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => setResetStep('request')}
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="btn btn-primary"
                        style={{ flex: 2, fontWeight: 700 }}
                      >
                        {isLoading ? 'Updating...' : 'Set New Password'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        background: '#ffffff',
        borderTop: '1px solid #ede9fe',
        padding: '18px 24px',
        textAlign: 'center',
        fontSize: 12,
        color: '#94a3b8'
      }}>
        Expense Autopilot • Context-Aware Corporate Expense Auditing & Chronological Ledger • Built for Enterprise Compliance
      </footer>
    </div>
  );
};
