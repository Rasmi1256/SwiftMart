// src/app/orders/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Order } from '@/types';

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api<{ message: string; orders: Order[] }>('/orders');
        setOrders(response.orders);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch order history.');
        console.error('Fetch order history error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <Link href="/products" className="text-indigo-600 hover:underline">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Your Order History</h1>

          {orders.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-600 text-lg mb-4">You have not placed any orders yet.</p>
              <Link href="/products" className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-semibold text-gray-800">Order #{order.id.substring(0, 8)}...</h2>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      order.status === 'placed' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">Total Amount: <span className="font-bold">${order.total_amount.toFixed(2)}</span></p>
                  <p className="text-gray-600 mb-4">Ordered On: {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString()}</p>
                  <Link href={`/orders/${order.id}`} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 text-sm">
                    View Details
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}