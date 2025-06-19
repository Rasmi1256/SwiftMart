// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/global.css";
import Link from "next/link"; // Import Link
import { ShoppingCart, User } from 'lucide-react'; // Assuming lucide-react is installed

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
              <Link href="/cart" className="relative text-gray-700 hover:text-indigo-600">
                <ShoppingCart size={24} />
                {/* You can add a dynamic cart item count here later */}
                {/* <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">3</span> */}
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
      </body>
    </html>
  );
}