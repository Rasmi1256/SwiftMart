// src/components/AuthGuard.tsx
'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/auth';
import LoadingSpinner from './LoadingSpinner'; // We'll create this next

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      // In a real app, you'd send this token to a backend endpoint (e.g., /api/users/validate-token)
      // to verify its validity and expiration. For this MVP, we just check for its presence.
      setIsAuthenticated(true);
    } else {
      router.replace('/login'); // Redirect to login if no token
    }
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return <LoadingSpinner />; // Show a loading spinner while checking auth status
  }

  if (!isAuthenticated) {
    return null; // Don't render children if not authenticated
  }

  return <>{children}</>;
}