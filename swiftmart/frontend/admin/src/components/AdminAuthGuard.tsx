// src/components/AdminAuthGuard.tsx
'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getAuthToken } from '@/lib/auth';
import LoadingSpinner from './LoadingSpinner';

interface AdminAuthGuardProps {
  children: ReactNode;
}

export default function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      // In a real admin app, you'd ALSO send this token to a backend
      // endpoint (e.g., /api/admin/validate-token) that checks if
      // the user associated with the token has an 'admin' role.
      // For this MVP, we just check for token presence.
      setIsAuthenticated(true);
    } else {
      router.replace('/login'); // Redirect to admin login if no token
    }
    setIsLoading(false);
  }, [router]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}