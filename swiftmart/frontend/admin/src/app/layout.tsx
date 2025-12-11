// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css";
import Link from "next/link"; // Import Link
import AuthProvider from "@/components/AuthProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SwiftMart Admin",
  description: "SwiftMart Quick Commerce Admin Panel",
};

const Header = () => {
    return (
        <header className="fixed w-full bg-white shadow-md z-10 p-4">
            <nav className="flex justify-between items-center max-w-7xl mx-auto">
                <Link href="/dashboard" className="text-xl font-bold text-indigo-600">SwiftMart Admin</Link>
                <div className="space-x-4">
                    <Link href="/dashboard" className="text-gray-600 hover:text-indigo-600">Dashboard</Link>
                    <Link href="/products" className="text-gray-600 hover:text-indigo-600">Products</Link>
                    <Link href="/inventory" className="text-gray-600 hover:text-indigo-600">Inventory</Link>
                    <Link href="/fulfillment" className="text-indigo-600 font-semibold border-b-2 border-indigo-600">Fulfillment</Link> {/* NEW LINK */}
                    {/* ... other links */}
                </div>
                {/* ... Auth/User info */}
            </nav>
        </header>
    );
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
        <Header /> {/* Admin Header will contain updated links */}
        <main className="min-h-[calc(100vh-64px)] pt-20">
                        {children}
                    </main>
          </AuthProvider>          
      </body>
    </html>
  );
}