'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import jwt from 'jsonwebtoken';
import { User } from '@/types';
import { getAuthToken, setAuthToken, removeAuthToken } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      try {
        const decoded = jwt.decode(token) as { user?: User } | null;
        if (decoded?.user) {
          setUser(decoded.user);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Invalid token:', error);
        setUser(null);
        setIsAuthenticated(false);
        removeAuthToken();
      }
    } else {
      setUser(null);
      setIsAuthenticated(false);
    }
    setIsLoading(false);
  }, []);

  const login = (token: string) => {
    setAuthToken(token);
    try {
      const decoded = jwt.decode(token) as { user?: User } | null;
      if (decoded?.user) {
        setUser(decoded.user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Invalid token:', error);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    removeAuthToken();
  };

  if (isLoading) {
    return <div>Loading...</div>; // Or use LoadingSpinner
  }

  const value = { user, isAuthenticated, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
