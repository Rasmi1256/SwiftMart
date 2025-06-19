// src/app/orders/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import AdminAuthGuard from '@/components/AdminAuthGuard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { AdminOrder, OrderStatus, SingleOrderResponse } from '@/types';
import Image from 'next/image';

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<OrderStatus | ''>('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  const fetchOrder = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response: SingleOrderResponse = await api(`/orders/${id}`);
      setOrder(response.order);
      setUpdateStatus(response.order.status); // Set initial status for the dropdown
    } catch (err: any) {
      setError(err.message || 'Failed to fetch order details.');
      console.error('Fetch order detail error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleStatusUpdate = async () => {
    if (!order || !updateStatus || updateStatus === order.status) {
      setUpdateMessage('No status change detected or order not loaded.');
      setTimeout(() => setUpdateMessage(null), 3000);
      return;
    }

    setUpdateLoading(true);
    setUpdateMessage(null);
    try {
      await api(`/orders/${order.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: updateStatus }),
      });
      setUpdateMessage('Order status updated successfully!');
      // Optimistically update status on UI or refetch
      if (order) {
        setOrder({ ...order, status: updateStatus });
      }
    } catch (err: any) {
      setUpdateMessage(`Failed to update status: ${err.message}`);
      console.error('Status update error:', err);
    } finally {
      setUpdateLoading(false);
      setTimeout(() => setUpdateMessage(null), 3000);
    }
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
          <Link href="/orders" className="text-indigo-600 hover:underline">Back to Order List</Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Order Not Found</h2>
          <p className="text-gray-700 mb-6">The order you are looking for does not exist.</p>
          <Link href="/orders" className="text-indigo-600 hover:underline">Back to Order List</Link>
        </div>
      </div>
    );
  }

  const statusOptions: OrderStatus[] = ['pending', 'placed', 'processing', 'shipped', 'delivered', 'cancelled'];

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6 sm:p-8">
          <Link href="/orders" className="text-indigo-600 hover:underline mb-4 block">
            &larr; Back to Order List
          </Link>
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Order Details #{order.id.substring(0, 8)}...</h1>

          {updateMessage && (
            <div className={`p-3 mb-4 rounded-md text-center ${updateMessage.includes('Failed') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {updateMessage}
            </div>
          )}

          <section className="mb-8 border-b pb-6">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Order Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg">
              <p><strong className="text-gray-600">Order ID:</strong> {order.id}</p>
              <p><strong className="text-gray-600">User ID:</strong> {order.userId}</p>
              <p><strong className="text-gray-600">Current Status:</strong>{' '}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  order.status === 'placed' ? 'bg-blue-100 text-blue-800' :
                  order.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                  order.status === 'shipped' ? 'bg-purple-100 text-purple-800' :
                  order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </p>
              <p><strong className="text-gray-600">Total Amount:</strong> ${order.totalAmount.toFixed(2)}</p>
              <p><strong className="text-gray-600">Ordered On:</strong> {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}</p>
              <p><strong className="text-gray-600">Last Updated:</strong> {new Date(order.updatedAt).toLocaleDateString()} {new Date(order.updatedAt).toLocaleTimeString()}</p>
              <p><strong className="text-gray-600">Payment Method:</strong> {order.paymentMethod || 'N/A'}</p>
              <p><strong className="text-gray-600">Shipping Address ID:</strong> {order.shippingAddressId || 'N/A'}</p>
            </div>
          </section>

          <section className="mb-8 border-b pb-6">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Update Order Status</h2>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <select
                className="flex-grow px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                value={updateStatus}
                onChange={(e) => setUpdateStatus(e.target.value as OrderStatus)}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
              </select>
              <button
                onClick={handleStatusUpdate}
                disabled={updateLoading || updateStatus === order.status}
                className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateLoading ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Items in this Order</h2>
            {!order.items || order.items.length === 0 ? (
              <p className="text-gray-600">No items found for this order.</p>
            ) : (
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center border border-gray-200 rounded-lg p-3 shadow-sm">
                    <div className="relative w-16 h-16 mr-4 flex-shrink-0">
                      <Image
                        src={item.productImageUrl || `https://placehold.co/60x60/E0F7FA/000000?text=${encodeURIComponent(item.productName)}`}
                        alt={item.productName}
                        fill
                        style={{ objectFit: 'cover' }}
                        className="rounded-md"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://placehold.co/60x60/E0F7FA/000000?text=${encodeURIComponent(item.productName)}`;
                        }}
                      />
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-lg font-semibold text-gray-800">{item.productName}</h3>
                      <p className="text-gray-600">Quantity: {item.quantity}</p>
                      <p className="text-gray-600">Unit Price: ${item.unitPrice.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-indigo-600">${(item.unitPrice * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AdminAuthGuard>
  );
}