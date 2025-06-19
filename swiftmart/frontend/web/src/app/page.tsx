'use client';

import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 py-16 text-center">
      <h1 className="text-5xl font-extrabold text-gray-900 mb-6">
        Welcome to SwiftMart
      </h1>
      <p className="text-xl text-gray-700 max-w-xl mb-10">
        Experience AI-Powered Quick Commerce — fast, reliable, and tailored just for you.
      </p>
      <div className="space-x-4">
        <Link
          href="/login"
          className="inline-block px-6 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-700 transition"
        >
          Login
        </Link>
        <Link
          href="/register"
          className="inline-block px-6 py-3 border border-indigo-600 text-indigo-600 font-semibold rounded-md hover:bg-indigo-50 transition"
        >
          Register
        </Link>
      </div>
      <section className="mt-16 max-w-4xl text-left">
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Why Choose SwiftMart?</h2>
        <ul className="list-disc list-inside space-y-3 text-gray-700 text-lg">
          <li>Lightning-fast delivery powered by AI optimization</li>
          <li>Wide selection of products at your fingertips</li>
          <li>Seamless and secure checkout experience</li>
          <li>Personalized recommendations tailored to your needs</li>
          <li>24/7 customer support to assist you anytime</li>
        </ul>
      </section>
    </main>
  );
}
