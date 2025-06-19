// src/app/cart/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Order, CartItem } from '@/types';
import Image from 'next/image';
import { Trash2, Plus, Minus } from 'lucide-react';

export default function CartPage() {
  const [cart, setCart] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const fetchCart = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api<{ message: string; cart: Order | null }>('/cart');
      setCart(response.cart);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch cart.');
      console.error('Fetch cart error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const handleUpdateQuantity = async (itemId: string, currentQuantity: number, delta: number) => {
    const newQuantity = currentQuantity + delta;
    if (newQuantity <= 0) {
      // If quantity becomes 0 or less, remove the item
      handleRemoveItem(itemId);
      return;
    }
    try {
      setLoading(true);
      await api(`/cart/update/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity: newQuantity }),
      });
      await fetchCart(); // Re-fetch cart to get updated state
    } catch (err: any) {
      setError(err.message || 'Failed to update item quantity.');
      console.error('Update quantity error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      setLoading(true);
      await api(`/cart/remove/${itemId}`, {
        method: 'DELETE',
      });
      await fetchCart(); // Re-fetch cart to get updated state
    } catch (err: any) {
      setError(err.message || 'Failed to remove item from cart.');
      console.error('Remove item error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToCheckout = () => {
    if (cart && cart.total_amount > 0) {
      router.push('/checkout');
    } else {
      setError('Your cart is empty. Add some products before proceeding to checkout.');
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
          <Link href="/products" className="text-indigo-600 hover:underline">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-6 sm:p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Your Shopping Cart</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {!cart || cart.items.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-600 text-lg mb-4">Your cart is currently empty.</p>
              <Link href="/products" className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                Start Shopping
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {cart.items.map((item: CartItem) => (
                  <div key={item.id} className="flex items-center border-b border-gray-200 pb-4 last:border-b-0">
                    <div className="relative w-20 h-20 mr-4 flex-shrink-0">
                      <Image
                        src={item.product_image_url || `https://placehold.co/80x80/E0F7FA/000000?text=${encodeURIComponent(item.product_name)}`}
                        alt={item.product_name || 'Product image'}
                        fill
                        style={{ objectFit: 'cover' }}
                        className="rounded-md"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://placehold.co/80x80/E0F7FA/000000?text=${encodeURIComponent(item.product_name)}`;
                        }}
                      />
                    </div>
                    <div className="flex-grow">
                      <h2 className="text-lg font-semibold text-gray-800">{item.product_name}</h2>
                      <p className="text-gray-600">Unit Price: ${ item.unit_price}</p>
                      <div className="flex items-center mt-2">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity, -1)}
                          className="p-1 border border-gray-300 rounded-md hover:bg-gray-100"
                        >
                          <Minus size={16} />
                        </button>
                        <span className="mx-3 text-lg font-medium">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity, 1)}
                          className="p-1 border border-gray-300 rounded-md hover:bg-gray-100"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="text-lg font-bold text-indigo-600">${item.unit_price && item.quantity ? (item.unit_price * item.quantity).toFixed(2) : '0.00'}</p>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="mt-2 text-red-500 hover:text-red-700 flex items-center text-sm"
                      >
                        <Trash2 size={16} className="mr-1" /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-4 border-t border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800">Total:</h2>
                <p className="text-2xl font-bold text-indigo-700">${cart.total_amount ? cart.total_amount.toFixed(2) : '0.00'}</p>
              </div>

              <div className="mt-6">
                <button
                  onClick={handleProceedToCheckout}
                  className="w-full py-3 px-6 bg-indigo-600 text-white font-semibold rounded-md shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Proceed to Checkout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}