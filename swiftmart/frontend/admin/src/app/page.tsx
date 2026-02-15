// src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AdminHomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the dashboard page as the main admin view
    router.replace('/dashboard');
  }, [router]);

  return <LoadingSpinner />;
}