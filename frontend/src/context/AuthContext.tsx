import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthSession } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string, department?: string) => Promise<void>;
  logout: () => Promise<void>;
  quickDemoLogin: (role: 'employee' | 'manager' | 'finance' | 'admin') => Promise<void>;
  forgotPassword: (email: string) => Promise<{ message: string; reset_token?: string }>;
  resetPassword: (token: string, new_password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('ea_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const savedToken = localStorage.getItem('ea_auth_token');
    if (!savedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }
    try {
      const me = await api.getMe();
      setUser(me);
      setToken(savedToken);
    } catch (err) {
      console.warn('Session expired or invalid, clearing credentials:', err);
      localStorage.removeItem('ea_auth_token');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const session = await api.login(email, password);
    setUser(session.user);
    setToken(session.token);
  };

  const register = async (name: string, email: string, password: string, role = 'employee', department = 'Operations') => {
    const session = await api.register(name, email, password, role, department);
    setUser(session.user);
    setToken(session.token);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error(err);
    }
    localStorage.removeItem('ea_auth_token');
    setUser(null);
    setToken(null);
  };

  const quickDemoLogin = async (role: 'employee' | 'manager' | 'finance' | 'admin') => {
    let email = 'priya@acmecorp.com';
    let password = 'Password123!';
    if (role === 'manager') {
      email = 'manager@acmecorp.com';
      password = 'Manager123!';
    } else if (role === 'finance') {
      email = 'finance@acmecorp.com';
      password = 'Finance123!';
    } else if (role === 'admin') {
      email = 'admin@acmecorp.com';
      password = 'Admin123!';
    }
    await login(email, password);
  };

  const forgotPassword = async (email: string) => {
    return api.forgotPassword(email);
  };

  const resetPassword = async (tkn: string, new_pass: string) => {
    await api.resetPassword(tkn, new_pass);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      quickDemoLogin,
      forgotPassword,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
