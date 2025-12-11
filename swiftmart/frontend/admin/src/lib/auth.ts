// src/lib/auth.ts
import { useState, useEffect } from 'react';
import jwt from 'jsonwebtoken';
import { User } from '@/types';

export const setAuthToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('jwtTokenAdmin', token); // Use a different key for admin token
  }
};

export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('jwtTokenAdmin');
  }
  return null;
};

export const removeAuthToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('jwtTokenAdmin');
  }
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      try {
        const decoded = jwt.decode(token) as { user?: User } | null;
        setUser(decoded?.user || null);
      } catch (error) {
        console.error('Invalid token:', error);
        setUser(null);
      }
    } else {
      setUser(null);
    }
  }, []);

  return { user, isAuthenticated: !!user };
};
