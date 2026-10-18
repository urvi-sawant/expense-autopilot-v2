import React from 'react';
import {
  LayoutDashboard, ReceiptText, Clock, CopyCheck, ShieldAlert,
  Sliders, CheckCircle2, History, BarChart3, RotateCcw,
  Sparkles, UserCheck, Inbox, LogOut, LogIn, Users
} from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onQuickDemoLogin: (role: 'employee' | 'manager' | 'finance' | 'admin') => void;
  onResetDemo: () => void;
  isResetting?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onOpenAuth,
  onLogout,
  onQuickDemoLogin,
  onResetDemo,
  isResetting
}) => {
  const role = currentUser?.role || 'employee';

  // Role-specific navigation tabs
  const getNavItems = () => {
    if (role === 'employee') {
      return [
        { id: 'employee-home', label: 'My Workspace', icon: LayoutDashboard },
        { id: 'inbox', label: 'Upload Receipt', icon: Inbox },
        { id: 'expenses', label: 'My Expenses', icon: ReceiptText },
        { id: 'time-machine', label: 'Expense Time Machine', icon: Clock, signature: true }
      ];
    } else if (role === 'manager') {
      return [
        { id: 'approvals', label: 'Approvals Queue', icon: CheckCircle2 },
        { id: 'expenses', label: 'Expenses Review', icon: ReceiptText },
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'time-machine', label: 'Expense Time Machine', icon: Clock, signature: true },
        { id: 'audit-trail', label: 'Decision History', icon: History },
        { id: 'evaluation', label: 'Validation Report', icon: BarChart3 }
      ];
    } else if (role === 'finance') {
      return [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'expenses', label: 'Audit Queue', icon: ReceiptText },
        { id: 'time-machine', label: 'Expense Time Machine', icon: Clock, signature: true },
        { id: 'duplicates', label: 'Duplicate Detective', icon: CopyCheck },
        { id: 'risk-radar', label: 'Risk Radar', icon: ShieldAlert },
        { id: 'audit-trail', label: 'Audit Trail', icon: History },
        { id: 'evaluation', label: 'Validation Report', icon: BarChart3 }
      ];
    } else {
      // Admin: Full Access
      return [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'expenses', label: 'Expenses Master', icon: ReceiptText },
        { id: 'admin-users', label: 'User Governance', icon: Users },
        { id: 'approvals', label: 'Approvals', icon: CheckCircle2 },
        { id: 'time-machine', label: 'Expense Time Machine', icon: Clock, signature: true },
        { id: 'duplicates', label: 'Duplicate Detective', icon: CopyCheck },
        { id: 'risk-radar', label: 'Risk Radar', icon: ShieldAlert },
        { id: 'policy-studio', label: 'Policy Studio', icon: Sliders },
        { id: 'audit-trail', label: 'Audit Trail', icon: History },
        { id: 'evaluation', label: 'Validation Report', icon: BarChart3 }
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <header style={{
      background: '#ffffff',
      borderBottom: '1px solid #ddd6fe',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 10px rgba(109, 40, 217, 0.04)'
    }}>
      {/* Top Banner & Brand */}
      <div style={{
        maxWidth: 1600,
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #ede9fe'
      }}>
        {/* Logo & Tagline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
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
                padding: '2px 7px',
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

        {/* User Profile, Role Quick-Switch & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Active User Card & Quick Role Switcher */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#fbfbfe',
            border: '1px solid #ddd6fe',
            padding: '5px 12px',
            borderRadius: 8
          }}>
            <UserCheck size={15} color="#7c3aed" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>
                {currentUser ? currentUser.name : 'Guest User'}
              </span>
              <span style={{ fontSize: 10, color: '#64748b' }}>
                Role: <strong style={{ color: '#7c3aed', textTransform: 'capitalize' }}>{role}</strong>
              </span>
            </div>

            {/* Quick Demo Selector */}
            <select
              value={role}
              onChange={(e) => onQuickDemoLogin(e.target.value as any)}
              style={{
                marginLeft: 6,
                padding: '3px 8px',
                fontSize: 11,
                fontWeight: 600,
                color: '#6d28d9',
                background: '#ede9fe',
                border: '1px solid #c4b5fd',
                borderRadius: 6,
                cursor: 'pointer'
              }}
              title="One-click switch between Employee, Finance, and Admin demo roles"
            >
              <option value="employee">Priya (Employee)</option>
              <option value="manager">Rajesh (Manager Approver)</option>
              <option value="finance">Finance Auditor</option>
              <option value="admin">System Admin</option>
            </select>
          </div>

          {/* Sign In / Out Button */}
          {currentUser ? (
            <button
              onClick={onLogout}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6, borderColor: '#fecdd3', color: '#9f1239' }}
              title="Sign out of current account"
            >
              <LogOut size={13} />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <LogIn size={13} />
              <span>Sign In</span>
            </button>
          )}

          {/* Reset Demo Data Button */}
          <button
            onClick={onResetDemo}
            disabled={isResetting}
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            title="Reset dataset back to standard 15 competition scenarios"
          >
            <RotateCcw size={13} className={isResetting ? 'pulse-badge' : ''} />
            <span>{isResetting ? 'Resetting...' : 'Reset Demo'}</span>
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <nav style={{
        maxWidth: 1600,
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        overflowX: 'auto'
      }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '12px 14px',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '2px solid #7c3aed' : '2px solid transparent',
                color: isActive ? '#7c3aed' : (item.signature ? '#6d28d9' : '#475569'),
                fontSize: 13,
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = '#0f172a';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = item.signature ? '#6d28d9' : '#475569';
              }}
            >
              <Icon size={16} />
              <span>{item.label}</span>
              {item.signature && (
                <span style={{
                  fontSize: 9,
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: 99,
                  background: 'linear-gradient(90deg, #7c3aed, #4f46e5)',
                  color: '#ffffff',
                  boxShadow: '0 2px 6px rgba(124, 58, 237, 0.25)'
                }}>
                  SIGNATURE
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
