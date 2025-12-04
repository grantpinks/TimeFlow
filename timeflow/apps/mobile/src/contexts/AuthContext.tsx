/**
 * Auth Context
 *
 * Provides authentication state and methods throughout the app.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import * as api from '../lib/api';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: api.UserProfile | null;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<api.UserProfile | null>(null);

  // Check if user is already authenticated on app load
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const authenticated = await api.isAuthenticated();
      if (authenticated) {
        const userProfile = await api.getMe();
        setUser(userProfile);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // If token is invalid, clear it
      await api.clearAuthToken();
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (token: string) => {
    try {
      await api.setAuthToken(token);
      const userProfile = await api.getMe();
      setUser(userProfile);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Login failed:', error);
      await api.clearAuthToken();
      throw error;
    }
  };

  const logout = async () => {
    await api.clearAuthToken();
    setUser(null);
    setIsAuthenticated(false);
  };

  const refreshUser = async () => {
    try {
      const userProfile = await api.getMe();
      setUser(userProfile);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
