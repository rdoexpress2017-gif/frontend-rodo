import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser } from '../types/domain.types';
import { api, resetUnauthorizedLock } from '../services/api';

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isMaster: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem('rodo_auth');
    if (!saved) return null;
    try {
      return JSON.parse(saved) as AuthUser;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    const handleSessionExpired = () => {
      localStorage.removeItem('rodo_auth');
      setUser(null);
    };
    window.addEventListener('auth:session-expired', handleSessionExpired);
    return () => window.removeEventListener('auth:session-expired', handleSessionExpired);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post<AuthUser>('/auth/login', { email, password });
    localStorage.setItem('rodo_auth', JSON.stringify(response.data));
    resetUnauthorizedLock();
    setUser(response.data);
  };

  const logout = () => {
    localStorage.removeItem('rodo_auth');
    resetUnauthorizedLock();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isMaster: user?.role === 'MASTER',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
};
