// src/app/orders/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import AdminAuthGuard from '@/components/AdminAuthGuard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { AdminOrder, OrdersResponse, OrderStatus } from '@/types';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response: OrdersResponse = await api('/orders'); // Get all orders, admin endpoint
      // Filter orders on the client side for now. For large datasets, server-side filtering is better.
      let filteredOrders = response.orders;
      if (filterStatus !== 'all') {
        filteredOrders = filteredOrders.filter(order => order.status === filterStatus);
      }
      if (searchQuery) {
        filteredOrders = filteredOrders.filter(order =>
          order.id.includes(searchQuery) ||
          order.userId.includes(searchQuery) ||
          order.status.includes(searchQuery.toLowerCase())
        );
      }
      setOrders(filteredOrders);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch orders.');
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [filterStatus, searchQuery]); // Refetch when filter or search changes

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterStatus(e.target.value as OrderStatus | 'all');
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
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
        </div>
      </div>
    );
  }

  const statusOptions: (OrderStatus | 'all')[] = ['all', 'pending', 'placed', 'processing', 'shipped', 'delivered', 'cancelled'];

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-md p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Manage Orders</h1>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <input
              type="text"
              placeholder="Search by Order ID, User ID, Status..."
              className="flex-grow px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={searchQuery}
              onChange={handleSearchChange}
            />
            <select
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={filterStatus}
              onChange={handleStatusChange}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {orders.length === 0 ? (
            <p className="text-center text-gray-600 text-lg py-10">No orders found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User ID</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ordered On</th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
{orders.map((order) => (
  <tr key={order.id}>
    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
      <Link href={`/orders/${order.id}`} className="text-indigo-600 hover:underline">
        {order.id ? order.id.substring(0, 8) : 'N/A'}...
      </Link>
    </td>
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{order.userId ? order.userId.substring(0, 8) : 'N/A'}...</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.status === 'placed' ? 'bg-blue-100 text-blue-800' :
                          order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                          order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                          order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${order.totalAmount.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/orders/${order.id}`} className="text-indigo-600 hover:text-indigo-900">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminAuthGuard>
  );
}