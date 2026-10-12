import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session from stored token
  useEffect(() => {
    // Configure automatic logout on 401 unauthorized
    api.setUnauthorizedHandler(() => {
      setUser(null);
      setIsAuthenticated(false);
    });

    const initAuth = async () => {
      if (api.hasToken()) {
        try {
          const currentUser = await api.getCurrentUser();
          setUser(currentUser);
          setIsAuthenticated(true);
        } catch {
          api.clearToken();
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const res = await api.login({ email, password });
    setUser(res.user);
    setIsAuthenticated(true);
  };

  const register = async (name: string, email: string, password: string): Promise<void> => {
    const parts = name.trim().split(' ');
    const firstName = parts[0] || 'Patient';
    const lastName = parts.slice(1).join(' ') || 'User';

    const res = await api.signup({
      email,
      password,
      firstName,
      lastName,
    });
    setUser(res.user);
    setIsAuthenticated(true);
  };

  const logout = async (): Promise<void> => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const fresh = await api.getCurrentUser();
      setUser(fresh);
    } catch {
      // Ignore or let unauthorized handler trigger
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
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
