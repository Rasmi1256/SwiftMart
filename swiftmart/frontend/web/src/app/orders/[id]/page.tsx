// src/app/orders/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Order } from '@/types';
import Image from 'next/image';

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const fetchOrder = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await api<{ message: string; order: Order }>(`/orders/${id}`);
          setOrder(response.order);
        } catch (err: any) {
          setError(err.message || 'Failed to fetch order details.');
          console.error('Fetch order detail error:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchOrder();
    }
  }, [id]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <Link href="/orders" className="text-indigo-600 hover:underline">Back to Order History</Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Order Not Found</h2>
          <p className="text-gray-700 mb-6">The order you are looking for does not exist or does not belong to you.</p>
          <Link href="/orders" className="text-indigo-600 hover:underline">Back to Order History</Link>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6 sm:p-8">
          <Link href="/orders" className="text-indigo-600 hover:underline mb-4 block">
            &larr; Back to Order History
          </Link>
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Order Details #{order.id.substring(0, 8)}...</h1>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Order Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg">
              <p><strong className="text-gray-600">Status:</strong>{' '}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  order.status === 'placed' ? 'bg-blue-100 text-blue-800' :
                  order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </span>
              </p>
              <p><strong className="text-gray-600">Total Amount:</strong> ${order.total_amount.toFixed(2)}</p>
              <p><strong className="text-gray-600">Ordered On:</strong> {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString()}</p>
              <p><strong className="text-gray-600">Last Updated:</strong> {new Date(order.updated_at).toLocaleDateString()} {new Date(order.updated_at).toLocaleTimeString()}</p>
              <p><strong className="text-gray-600">Payment Method:</strong> {order.payment_method || 'N/A'}</p>
              {/* In a real app, you'd fetch address details using shipping_address_id from User Service */}
              <p><strong className="text-gray-600">Shipping Address ID:</strong> {order.shipping_address_id || 'N/A'}</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Items in this Order</h2>
            {order.items.length === 0 ? (
              <p className="text-gray-600">No items found for this order.</p>
            ) : (
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center border border-gray-200 rounded-lg p-3 shadow-sm">
                    <div className="relative w-16 h-16 mr-4 flex-shrink-0">
                      <Image
                        src={item.product_image_url || `https://placehold.co/60x60/E0F7FA/000000?text=${encodeURIComponent(item.product_name)}`}
                        alt={item.product_name}
                        fill
                        style={{ objectFit: 'cover' }}
                        className="rounded-md"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://placehold.co/60x60/E0F7FA/000000?text=${encodeURIComponent(item.product_name)}`;
                        }}
                      />
                    </div>
                    <div className="flex-grow">
                      <h3 className="text-lg font-semibold text-gray-800">{item.product_name}</h3>
                      <p className="text-gray-600">Quantity: {item.quantity}</p>
                      <p className="text-gray-600">Unit Price: ${item.unit_price.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-indigo-600">${(item.unit_price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </AuthGuard>
  );
}