// src/components/Header.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { removeAuthToken } from '@/lib/auth';

export default function Header() {
  const router = useRouter();

  const handleLogout = () => {
    removeAuthToken();
    router.replace('/login');
  };

  return (
    <header className="bg-indigo-700 shadow-md p-4 sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/orders" className="text-2xl font-bold text-white">
          SwiftMart Admin
        </Link>
        <div className="flex items-center space-x-4">
          <Link href="/orders" className="text-white hover:text-indigo-200 font-medium">
            Orders
          </Link>
          {/* Add other admin links here later, e.g., Products, Users */}
          <button
            onClick={handleLogout}
            className="px-3 py-1 bg-indigo-500 text-white rounded-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 focus:ring-offset-indigo-700 text-sm"
          >
            Logout
          </button>
        </div>
      </nav>
    </header>
  );
}