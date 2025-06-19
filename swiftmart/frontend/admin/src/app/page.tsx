// src/app/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AdminHomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the orders page as the main admin dashboard
    router.replace('/orders');
  }, [router]);

  return <LoadingSpinner />;
}