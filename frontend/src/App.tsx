import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ReceiptInspector } from './components/ReceiptInspector';
import { AuthModal } from './components/AuthModal';

import { LoginPage } from './pages/LoginPage';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { AdminUserManagement } from './pages/AdminUserManagement';
import { OverviewDashboard } from './pages/OverviewDashboard';
import { ExpenseQueue } from './pages/ExpenseQueue';
import { ReceiptInbox } from './pages/ReceiptInbox';
import { TimeMachineLedger } from './pages/TimeMachineLedger';
import { DuplicateDetectivePage } from './pages/DuplicateDetectivePage';
import { RiskRadarPage } from './pages/RiskRadarPage';
import { PolicyStudioPage } from './pages/PolicyStudioPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { EvaluationPage } from './pages/EvaluationPage';

import { api } from './api/client';
import { Expense, OverviewStats, DuplicateCandidate, RiskAlert } from './types';
import { Sparkles } from 'lucide-react';

export function App() {
  const { user, isLoading: isAuthLoading, logout, quickDemoLogin } = useAuth();

  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([]);
  
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Automatically determine the initial dashboard & enforce role boundaries
  useEffect(() => {
    if (!user) return;

    if (user.role === 'employee') {
      const employeeAllowedTabs = ['employee-home', 'inbox', 'expenses', 'time-machine'];
      if (!employeeAllowedTabs.includes(activeTab)) {
        setActiveTab('employee-home');
      }
    } else if (user.role === 'manager') {
      const managerAllowedTabs = ['approvals', 'expenses', 'overview', 'time-machine', 'audit-trail', 'evaluation'];
      if (!managerAllowedTabs.includes(activeTab)) {
        setActiveTab('approvals');
      }
    } else if (user.role === 'finance') {
      const financeAllowedTabs = ['overview', 'expenses', 'time-machine', 'duplicates', 'risk-radar', 'audit-trail', 'evaluation'];
      if (!financeAllowedTabs.includes(activeTab)) {
        setActiveTab('overview');
      }
    } else if (user.role === 'admin') {
      // Admin has access to all tabs
      if (activeTab === 'employee-home') {
        setActiveTab('overview');
      }
    }
  }, [user?.role]);

  // Load backend data whenever authenticated user changes
  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    try {
      const [statsData, expensesData, duplicatesData, alertsData] = await Promise.all([
        api.getOverviewStats().catch(() => null),
        api.getExpenses().catch(() => []),
        api.getDuplicates().catch(() => []),
        api.getRiskAlerts().catch(() => [])
      ]);
      if (statsData) setStats(statsData);
      setExpenses(expensesData || []);
      setDuplicates(duplicatesData || []);
      setRiskAlerts(alertsData || []);

      // If selectedExpense was active, refresh it
      if (selectedExpense) {
        const updated = (expensesData || []).find((e) => e.id === selectedExpense.id);
        if (updated) setSelectedExpense(updated);
      }
    } catch (err) {
      console.error('Failed fetching data:', err);
    }
  };

  const handleResetDemo = async () => {
    setIsResetting(true);
    try {
      await api.resetDemo();
      await loadAllData();
    } catch (err) {
      console.error('Failed to reset demo:', err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleSimulateTimeMachine = async () => {
    setIsSimulating(true);
    try {
      await api.simulateRetroactiveReceipt();
      await loadAllData();
      setActiveTab('time-machine');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleSaveCorrections = async (expenseId: string, updates: any) => {
    try {
      await api.updateExpenseCorrections(expenseId, updates);
      await loadAllData();
      setSelectedExpense(null);
    } catch (err) {
      console.error('Failed saving corrections:', err);
    }
  };

  const handleReviewAction = async (expenseId: string, action: string, reason: string) => {
    try {
      await api.reviewExpense(expenseId, action, reason, user?.name || 'Finance Auditor');
      await loadAllData();
      setSelectedExpense(null);
    } catch (err) {
      console.error('Failed reviewing expense:', err);
    }
  };

  // 1. Loading State Screen
  if (isAuthLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 50%, #fdf6e2 100%)',
        gap: 16
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(124, 58, 237, 0.35)',
          animation: 'pulse 1.5s infinite'
        }}>
          <Sparkles size={28} color="#ffffff" />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
          Connecting to Expense Autopilot...
        </div>
        <div style={{ fontSize: 12, color: '#64748b' }}>
          Verifying cryptographic session & policy rules
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State: Show Public Login Page First
  // "Do not show the private dashboard before authentication."
  if (!user) {
    return <LoginPage />;
  }

  // 3. Authenticated State: Show Role-Tailored Private Dashboard
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Enterprise Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={logout}
        onQuickDemoLogin={quickDemoLogin}
        onResetDemo={handleResetDemo}
        isResetting={isResetting}
      />

      {/* Main Container */}
      <main style={{
        maxWidth: 1600,
        width: '100%',
        margin: '0 auto',
        padding: '24px 24px 60px 24px',
        flex: 1
      }}>
        {/* Employee Self-Service Workspace */}
        {activeTab === 'employee-home' && (
          <EmployeeDashboard
            user={user}
            expenses={expenses}
            onSelectExpense={setSelectedExpense}
            onRefreshAll={loadAllData}
            onNavigateToInbox={() => setActiveTab('inbox')}
          />
        )}

        {/* Admin User Governance */}
        {activeTab === 'admin-users' && user.role === 'admin' && (
          <AdminUserManagement />
        )}

        {/* Finance & Management Overview */}
        {activeTab === 'overview' && user.role !== 'employee' && (
          <OverviewDashboard
            stats={stats}
            expenses={expenses}
            onSelectExpense={setSelectedExpense}
            onSimulateTimeMachine={handleSimulateTimeMachine}
            isSimulating={isSimulating}
            onNavigateToTimeMachine={() => setActiveTab('time-machine')}
          />
        )}

        {/* Expenses List */}
        {activeTab === 'expenses' && (
          <ExpenseQueue
            expenses={expenses}
            onSelectExpense={setSelectedExpense}
          />
        )}

        {/* Ingestion & Receipt Upload */}
        {activeTab === 'inbox' && (
          <ReceiptInbox
            onRefreshAll={loadAllData}
            onNavigateToExpenses={() => setActiveTab(user.role === 'employee' ? 'expenses' : 'expenses')}
          />
        )}

        {/* Signature Feature: Expense Time Machine */}
        {activeTab === 'time-machine' && (
          <TimeMachineLedger
            expenses={expenses}
            onSelectExpense={setSelectedExpense}
            onRefreshAll={loadAllData}
          />
        )}

        {/* Duplicate Detective (Finance & Admin) */}
        {activeTab === 'duplicates' && user.role !== 'employee' && (
          <DuplicateDetectivePage
            duplicates={duplicates}
            expenses={expenses}
            onSelectExpense={setSelectedExpense}
            onRefreshAll={loadAllData}
          />
        )}

        {/* Risk Radar (Finance & Admin) */}
        {activeTab === 'risk-radar' && user.role !== 'employee' && (
          <RiskRadarPage
            alerts={riskAlerts}
            expenses={expenses}
            onSelectExpense={setSelectedExpense}
            onRefreshAll={loadAllData}
          />
        )}

        {/* Policy Studio (Admin Only) */}
        {activeTab === 'policy-studio' && user.role === 'admin' && (
          <PolicyStudioPage
            onRefreshAll={loadAllData}
          />
        )}

        {/* Approvals Queue (Finance & Admin) */}
        {activeTab === 'approvals' && user.role !== 'employee' && (
          <ApprovalsPage
            expenses={expenses}
            onSelectExpense={setSelectedExpense}
            onReviewAction={handleReviewAction}
          />
        )}

        {/* Audit Trail (Finance & Admin) */}
        {activeTab === 'audit-trail' && user.role !== 'employee' && (
          <AuditTrailPage />
        )}

        {/* System Validation Report & Evaluation Benchmark */}
        {activeTab === 'evaluation' && (
          <EvaluationPage />
        )}
      </main>

      {/* Side-by-Side Receipt Inspector Modal */}
      {selectedExpense && (
        <ReceiptInspector
          expense={selectedExpense}
          onClose={() => setSelectedExpense(null)}
          onSaveCorrections={handleSaveCorrections}
          onReviewAction={handleReviewAction}
        />
      )}

      {/* Profile & Switcher Modal */}
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
