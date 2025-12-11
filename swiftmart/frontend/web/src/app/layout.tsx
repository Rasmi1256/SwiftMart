// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "../styles/global.css";
import Link from "next/link";
import { ShoppingCart, User } from 'lucide-react';
import ChatbotWidget from '@/components/ChatbotWidget';
import NotificationDropdown from '@/components/NotificationDropdown'; // NEW
import NotificationToast from '@/components/NotificationToast'; // NEW

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SwiftMart - Quick Commerce",
  description: "AI-Powered Quick Commerce App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header className="bg-white shadow-sm p-4 sticky top-0 z-50">
          <nav className="max-w-7xl mx-auto flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-indigo-600">
              SwiftMart
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/products" className="text-gray-700 hover:text-indigo-600 font-medium">
                Products
              </Link>
              <NotificationDropdown /> {/* NEW: Notification Component */}
              <Link href="/cart" className="relative text-gray-700 hover:text-indigo-600">
                <ShoppingCart size={24} />
              </Link>
              <Link href="/dashboard" className="text-gray-700 hover:text-indigo-600">
                <User size={24} />
              </Link>
            </div>
          </nav>
        </header>
        <main>
          {children}
        </main>
        <NotificationToast />
        <ChatbotWidget />
      </body>
    </html>
  );
}
