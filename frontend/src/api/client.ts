import {
  Expense, Receipt, DuplicateCandidate, RiskAlert, AuditEvent,
  PolicyRule, OverviewStats, User, AuthSession, EvaluationReport
} from '../types';

const API_BASE = 'http://127.0.0.1:8000/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('ea_auth_token');
  if (token) {
    return { 'Authorization': `Bearer ${token}` };
  }
  return {};
}

export const api = {
  // Authentication & Users
  async login(email: string, password: string): Promise<AuthSession> {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
    } catch {
      throw new Error(`Unable to connect to backend API at ${API_BASE}. Please ensure the FastAPI server is running.`);
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(err.detail || 'Login failed');
    }
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('ea_auth_token', data.token);
    }
    return data;
  },

  async register(name: string, email: string, password: string, role = 'employee', department = 'Operations'): Promise<AuthSession> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role, department })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
      throw new Error(err.detail || 'Registration failed');
    }
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('ea_auth_token', data.token);
    }
    return data;
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Unauthenticated');
    return res.json();
  },

  async logout(): Promise<void> {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    }).catch(() => {});
    localStorage.removeItem('ea_auth_token');
  },

  async forgotPassword(email: string): Promise<{ message: string; reset_token?: string }> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return res.json();
  },

  async resetPassword(token: string, new_password: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, new_password })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Reset failed' }));
      throw new Error(err.detail || 'Password reset failed');
    }
    return res.json();
  },

  // User Management (Admin only)
  async getUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/users`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const res = await fetch(`${API_BASE}/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update user');
    return res.json();
  },

  // Overview Stats
  async getOverviewStats(): Promise<OverviewStats> {
    const res = await fetch(`${API_BASE}/overview/stats`, {
      headers: { ...getAuthHeader() }
    });
    return res.json();
  },

  // Expenses
  async getExpenses(filters?: { employee_id?: string; category?: string; status?: string; search?: string }): Promise<Expense[]> {
    const params = new URLSearchParams();
    if (filters?.employee_id) params.append('employee_id', filters.employee_id);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    const res = await fetch(`${API_BASE}/expenses?${params.toString()}`, {
      headers: { ...getAuthHeader() }
    });
    return res.json();
  },

  async getExpenseDetail(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/expenses/${id}`, {
      headers: { ...getAuthHeader() }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to fetch expense details' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async submitExpense(data: any): Promise<any> {
    const res = await fetch(`${API_BASE}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to submit expense' }));
      throw new Error(err.detail || 'Failed to submit expense');
    }
    return res.json();
  },

  async updateExpenseCorrections(id: string, updates: any): Promise<any> {
    const res = await fetch(`${API_BASE}/expenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to update expense' }));
      throw new Error(err.detail || 'Failed to update expense');
    }
    return res.json();
  },

  async reviewExpense(id: string, action: string, reason: string, reviewer_name = 'Authorized Approver'): Promise<any> {
    const res = await fetch(`${API_BASE}/expenses/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ action, reason, reviewer_name })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Action failed' }));
      throw new Error(err.detail || `HTTP ${res.status}: Action failed`);
    }
    return res.json();
  },

  // Receipts
  async uploadReceipt(file: File, employee_id = 'EMP-001', trip_id?: string): Promise<any> {
    const form = new FormData();
    form.append('file', file);
    form.append('employee_id', employee_id);
    if (trip_id) form.append('trip_id', trip_id);
    const res = await fetch(`${API_BASE}/receipts/upload`, {
      method: 'POST',
      headers: { ...getAuthHeader() },
      body: form
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to upload receipt' }));
      throw new Error(err.detail || 'Failed to upload receipt');
    }
    return res.json();
  },

  async getReceipts(): Promise<Receipt[]> {
    const res = await fetch(`${API_BASE}/receipts`, {
      headers: { ...getAuthHeader() }
    });
    return res.json();
  },

  // Time Machine
  async getTimeline(employee_id?: string): Promise<any[]> {
    const url = employee_id ? `${API_BASE}/time-machine/timeline?employee_id=${employee_id}` : `${API_BASE}/time-machine/timeline`;
    const res = await fetch(url, {
      headers: { ...getAuthHeader() }
    });
    return res.json();
  },

  async getAllowanceSnapshot(employee_id = 'EMP-001', date = '2026-10-13', category = 'Meals'): Promise<any> {
    const res = await fetch(`${API_BASE}/time-machine/allowance-snapshot?employee_id=${employee_id}&date=${date}&category=${category}`, {
      headers: { ...getAuthHeader() }
    });
    return res.json();
  },

  async simulateRetroactiveReceipt(): Promise<any> {
    const res = await fetch(`${API_BASE}/time-machine/simulate-retroactive-receipt`, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    return res.json();
  },

  // Duplicates & Evidence Graph
  async getDuplicates(): Promise<DuplicateCandidate[]> {
    const res = await fetch(`${API_BASE}/duplicates`, {
      headers: { ...getAuthHeader() }
    });
    return res.json();
  },

  async resolveDuplicate(dupId: string, disposition: string, notes: string): Promise<any> {
    const res = await fetch(`${API_BASE}/duplicates/${dupId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ disposition, notes })
    });
    return res.json();
  },

  async getEvidenceGraph(): Promise<{ nodes: any[]; links: any[] }> {
    const res = await fetch(`${API_BASE}/duplicates/evidence-graph`, {
      headers: { ...getAuthHeader() }
    });
    return res.json();
  },

  // Risk Radar
  async getRiskAlerts(): Promise<RiskAlert[]> {
    const res = await fetch(`${API_BASE}/risk-radar/alerts`, {
      headers: { ...getAuthHeader() }
    });
    return res.json();
  },

  async dismissRiskAlert(alertId: string, reason: string): Promise<any> {
    const res = await fetch(`${API_BASE}/risk-radar/alerts/${alertId}/dismiss`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ reason })
    });
    return res.json();
  },

  // Policy Studio
  async getPolicyRules(): Promise<PolicyRule[]> {
    const res = await fetch(`${API_BASE}/policies/rules`, {
      headers: { ...getAuthHeader() }
    });
    return res.json();
  },

  async updatePolicyRule(ruleId: string, updates: any): Promise<any> {
    const res = await fetch(`${API_BASE}/policies/rules/${ruleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(updates)
    });
    return res.json();
  },

  // Audit Trail
  async getAuditTrail(): Promise<AuditEvent[]> {
    const res = await fetch(`${API_BASE}/audit/events`, {
      headers: { ...getAuthHeader() }
    });
    return res.json();
  },

  // Evaluation & Validation Report
  async getEvaluationReport(): Promise<EvaluationReport> {
    const res = await fetch(`${API_BASE}/evaluation/report`, {
      headers: { ...getAuthHeader() }
    });
    return res.json();
  },

  async getEvaluationMetrics(): Promise<any> {
    const res = await fetch(`${API_BASE}/evaluation/metrics`, {
      headers: { ...getAuthHeader() }
    });
    return res.json();
  },

  async runEvaluationBenchmark(): Promise<any> {
    const res = await fetch(`${API_BASE}/evaluation/run`, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    return res.json();
  },

  async exportEvaluationReport(format = 'csv'): Promise<Blob | any> {
    const res = await fetch(`${API_BASE}/evaluation/export?format=${format}`, {
      headers: { ...getAuthHeader() }
    });
    if (format === 'csv') {
      return res.blob();
    }
    return res.json();
  },

  // Demo Reset
  async resetDemo(): Promise<any> {
    const res = await fetch(`${API_BASE}/demo/reset`, {
      method: 'POST',
      headers: { ...getAuthHeader() }
    });
    return res.json();
  }
};
