// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../styles/globals.css"; // Ensure this import is present
import Header from "@/components/Header"; // Import the Admin Header

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SwiftMart Admin",
  description: "SwiftMart Quick Commerce Admin Panel",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header /> {/* Admin Header */}
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}