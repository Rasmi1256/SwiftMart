// src/app/dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { removeAuthToken } from '@/lib/auth';
import AuthGuard from '@/components/AuthGuard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ProfileResponse, Address } from '@/types';

export default function DashboardPage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data: ProfileResponse = await api('/users/profile');
        setProfile(data);
      } catch (err: unknown) {
        let message = 'Failed to fetch profile.';
        if (err instanceof Error) {
          message = err.message;
          // If token is invalid or expired, redirect to login
          if (err.message.includes('Not authorized')) {
            removeAuthToken();
            router.replace('/login');
          }
        }
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [router]);

  const handleLogout = () => {
    removeAuthToken();
    router.replace('/login');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">No Profile Data</h2>
          <p className="text-gray-700 mb-6">Could not load user profile.</p>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Welcome, {profile.firstName || profile.email}!</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Logout
            </button>
          </div>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Your Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg">
              <p><strong className="text-gray-600">Email:</strong> {profile.email}</p>
              <p><strong className="text-gray-600">First Name:</strong> {profile.firstName || 'N/A'}</p>
              <p><strong className="text-gray-600">Last Name:</strong> {profile.lastName || 'N/A'}</p>
              <p><strong className="text-gray-600">Phone Number:</strong> {profile.phoneNumber || 'N/A'}</p>
              <p><strong className="text-gray-600">Member Since:</strong> {new Date(profile.createdAt || '').toLocaleDateString()}</p>
            </div>
            {/* Add a button here to edit profile if desired */}
            <button className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              Edit Profile
            </button>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Your Addresses</h2>
            {profile.addresses.length === 0 ? (
              <p className="text-gray-600">No addresses added yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.addresses.map((address: Address) => (
                  <div key={address.id} className="border border-gray-200 rounded-lg p-4 shadow-sm">
                    <p className="font-medium text-gray-800">{address.addressLine1}</p>
                    {address.addressLine2 && <p className="text-gray-700">{address.addressLine2}</p>}
                    <p className="text-gray-700">{address.city}, {address.state} {address.zipCode}</p>
                    <p className="text-gray-700">{address.country}</p>
                    {address.isDefault && (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 mt-2">
                        Default
                      </span>
                    )}
                    {/* Add buttons here to edit/delete addresses */}
                    <div className="mt-3 flex space-x-2">
                      <button className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600">Edit</button>
                      <button className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Add a button here to add new address */}
            <button className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
              Add New Address
            </button>
          </section>
        </div>
      </div>
    </AuthGuard>
  );
}