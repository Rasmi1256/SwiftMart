// src/app/register/page.tsx
/*'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { setAuthToken } from '@/lib/auth';
import { AuthResponse } from '@/types';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data: AuthResponse = await api('/users/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, firstName, lastName, phoneNumber }),
      });
      setAuthToken(data.token);
      router.push('/dashboard'); // Redirect to dashboard on successful registration
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Register for SwiftMart</h1>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              id="email"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              id="password"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name (Optional)</label>
            <input
              type="text"
              id="firstName"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name (Optional)</label>
            <input
              type="text"
              id="lastName"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">Phone Number (Optional)</label>
            <input
              type="tel"
              id="phoneNumber"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={loading}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}*/
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { setAuthToken } from '@/lib/auth';
import { AuthResponse } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data: AuthResponse = await api('/users/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, firstName, lastName, phoneNumber }),
      });
      setAuthToken(data.token);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

   const formVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10,
        delay: 0.2, // Delay the form animation slightly
        when: "beforeChildren", // Animate parent before children
        staggerChildren: 0.1 // Stagger animation for input fields
      }
    }
  };

  const inputItemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const titleVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } }
  };


  return (
   <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-100 via-orange-200 to-red-100 p-4">
      <motion.div
        className="bg-white bg-opacity-90 p-10 rounded-3xl shadow-2xl w-full max-w-md backdrop-blur-sm"
        variants={formVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          className="text-4xl font-extrabold text-center text-orange-600 mb-8 drop-shadow-lg"
          variants={titleVariants}
        >
          Register for SwiftMart
        </motion.h1>

        <AnimatePresence>
          {error && (
            <motion.div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
              role="alert"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <span className="block sm:inline">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="space-y-6">
          <motion.div variants={inputItemVariants}>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              id="email"
              className="mt-1 block w-full px-4 py-2 border border-orange-200 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-200
                focus:shadow-[0_0_8px_2px_rgba(255,122,89,0.3)]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </motion.div>
          <motion.div variants={inputItemVariants}>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <input
              type="password"
              id="password"
              className="mt-1 block w-full px-4 py-2 border border-orange-200 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-200
                focus:shadow-[0_0_8px_2px_rgba(255,122,89,0.3)]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </motion.div>
          <motion.div variants={inputItemVariants}>
            <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-1">First Name (Optional)</label>
            <input
              type="text"
              id="firstName"
              className="mt-1 block w-full px-4 py-2 border border-orange-200 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-200
                focus:shadow-[0_0_8px_2px_rgba(255,122,89,0.3)]"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </motion.div>
          <motion.div variants={inputItemVariants}>
            <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-1">Last Name (Optional)</label>
            <input
              type="text"
              id="lastName"
              className="mt-1 block w-full px-4 py-2 border border-orange-200 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-200
                focus:shadow-[0_0_8px_2px_rgba(255,122,89,0.3)]"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </motion.div>
          <motion.div variants={inputItemVariants}>
            <label htmlFor="phoneNumber" className="block text-sm font-semibold text-gray-700 mb-1">Phone Number (Optional)</label>
            <input
              type="tel"
              id="phoneNumber"
              className="mt-1 block w-full px-4 py-2 border border-orange-200 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-all duration-200
                focus:shadow-[0_0_8px_2px_rgba(255,122,89,0.3)]"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </motion.div>
          <motion.button
            type="submit"
            className="w-full flex justify-center py-3 px-4 border-none rounded-lg shadow-md text-lg font-bold text-white bg-gradient-to-r from-orange-400 via-orange-500 to-red-400
              hover:from-orange-500 hover:to-red-500 hover:scale-105 hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
            disabled={loading}
            whileHover={{ scale: 1.02 }} // Even more subtle hover effect
            whileTap={{ scale: 0.98 }} // Click effect
          >
            {loading ? 'Registering...' : 'Register'}
          </motion.button>
        </form>
        <p className="mt-8 text-center text-sm text-gray-700">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-orange-500 hover:text-red-500 transition-colors duration-150">
            Login here
          </Link>
        </p>
      </motion.div>
    </div>
  );
}