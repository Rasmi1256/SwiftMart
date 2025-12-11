// src/lib/auth.ts
// src/lib/auth.ts
'use client';

import { useState, useEffect } from 'react';
import type { User } from '@/types';

/**
 * Minimal, safe JWT decode for browser usage (only decodes the payload; does NOT verify)
 */
function decodeJwtPayload<T = any>(token: string): T | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    // Add padding if needed
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded = atob(padded);
    return JSON.parse(decoded) as T;
  } catch (err) {
    console.error('Failed to decode JWT payload', err);
    return null;
  }
}

export const setAuthToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('jwtToken', token);
  }
};

export const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('jwtToken');
  }
  return null;
};

export const removeAuthToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('jwtToken');
  }
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      return;
    }

    const payload = decodeJwtPayload<Record<string, any>>(token);
    if (!payload) {
      setUser(null);
      return;
    }

    // Optional: handle "exp" expiry (exp is seconds since epoch)
    if (payload.exp && typeof payload.exp === 'number') {
      const nowSeconds = Math.floor(Date.now() / 1000);
      if (payload.exp <= nowSeconds) {
        // token expired
        removeAuthToken();
        setUser(null);
        return;
      }
    }

    // Map payload to your User type. Your server signs { id, email }.
    const mappedUser: User = {
      id: payload.id ? String(payload.id) : '',
      email: payload.email ?? '',
      firstName: payload.firstName ?? undefined,
      lastName: payload.lastName ?? undefined,
      // add other fields if your token contains them
    };

    setUser(mappedUser);
  }, []);

  return { user, isAuthenticated: !!user };
};
