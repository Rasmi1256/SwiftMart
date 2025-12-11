'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import {
  ShoppingCart,
  MinusCircle,
  PlusCircle,
  Trash2,
  ArrowRight,
  Tag,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

// --------------------
// Types aligned to backend
// --------------------

interface CartItem {
  productId: string;
  name: string;        // maps to orderItem.productName
  price: number;       // maps to orderItem.unitPrice
  quantity: number;
  imageUrl?: string;   // maps to orderItem.productImageUrl
}

interface CartDetails {
  orderId: string;
  items: CartItem[];
  couponCode?: string | null;
  discountAmount?: number | null;
  finalTotal?: number | null;
}

// For coupon POST response
interface ApplyCouponResponse {
  orderId: string;
  finalTotal: number;
  discountAmount: number;
  message: string;
}

// --------------------
// Component
// --------------------

export default function CartPage() {
  const { isAuthenticated, user } = useAuth();

  const [cart, setCart] = useState<CartDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponApplied, setCouponApplied] = useState<{ code: string; discount: number } | null>(null);

  const SHIPPING_FEE = 5.0;
  const TAX_RATE = 0.1;

  // --------------------
  // Fetch cart
  // --------------------

  const fetchCart = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setCouponError('');
    setMessage('');

    try {
      const response = await api<CartDetails | null>('/orders/cart');

      if (!response) {
        // No pending cart
        setCart(null);
        setCouponApplied(null);
        return;
      }

      setCart(response);

      const discount = response.discountAmount ?? 0;
      if (response.couponCode && discount > 0) {
        setCouponApplied({ code: response.couponCode, discount });
        setCouponCode(response.couponCode);
      } else {
        setCouponApplied(null);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch cart:', err);

      if (err instanceof ApiError && err.status === 404) {
        // In case backend ever returns 404 for "no pending cart"
        setCart(null);
        setCouponApplied(null);
      } else {
        setError('Failed to load cart. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // --------------------
  // Update quantity
  // --------------------

  const updateQuantity = async (productId: string, quantity: number) => {
    if (!user || !cart) return;

    try {
      await api('/orders/cart/item', {
        method: 'PUT',
        body: JSON.stringify({ productId, quantity }),
      });

      setMessage(`Quantity updated for product ${productId}.`);
      await fetchCart();
    } catch (err: unknown) {
      console.error('Failed to update quantity:', err);

      if (err instanceof ApiError) {
        setError(err.body?.message || 'Failed to update quantity.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update quantity.');
      }
    }
  };

  // --------------------
  // Remove item
  // --------------------

  const removeItem = async (productId: string) => {
    if (!user) return;

    try {
      await api(`/orders/cart/item/${productId}`, {
        method: 'DELETE',
      });

      setMessage('Item removed from cart.');
      await fetchCart();
    } catch (err: unknown) {
      console.error('Failed to remove item:', err);

      if (err instanceof ApiError) {
        setError(err.body?.message || 'Failed to remove item.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to remove item.');
      }
    }
  };

  // --------------------
  // Apply coupon
  // --------------------

  const applyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !cart || couponLoading || !couponCode) return;

    setCouponLoading(true);
    setCouponError('');
    setMessage('');

    try {
      const response = await api<ApplyCouponResponse>('/orders/cart/coupon', {
        method: 'POST',
        body: JSON.stringify({ code: couponCode }),
      });

      setCouponApplied({
        code: couponCode,
        discount: response.discountAmount,
      });

      setMessage(`Coupon ${couponCode} applied successfully!`);
      await fetchCart();
    } catch (err: unknown) {
      console.error('Failed to apply coupon:', err);

      if (err instanceof ApiError) {
        setCouponError(err.body?.message || 'Failed to apply coupon.');
      } else if (err instanceof Error) {
        setCouponError(err.message);
      } else {
        setCouponError('Failed to apply coupon.');
      }

      setCouponApplied(null);
    } finally {
      setCouponLoading(false);
    }
  };

  // --------------------
  // Totals
  // --------------------

  const calculateSubtotal = (item: CartItem) => item.price * item.quantity;

  const subtotalAmount =
    cart?.items.reduce((acc, item) => acc + calculateSubtotal(item), 0) ?? 0;

  const taxAmount = subtotalAmount * TAX_RATE;
  const totalBeforeDiscount = subtotalAmount + SHIPPING_FEE + taxAmount;

  // Prefer backend discount/finalTotal if present
  const effectiveDiscount =
    cart?.discountAmount ??
    couponApplied?.discount ??
    0;

  const finalTotalAmount =
    cart?.finalTotal ??
    (totalBeforeDiscount - effectiveDiscount);

  // --------------------
  // UI States
  // --------------------

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center mt-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Cart</h2>
        <p className="text-lg text-gray-600">
          Please{' '}
          <Link href="/login" className="text-indigo-600 hover:underline">
            log in
          </Link>{' '}
          to view your cart.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center mt-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Loading Cart...</h2>
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mx-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center mt-12">
        <h2 className="text-3xl font-bold text-red-600 mb-4">Error</h2>
        <p className="text-lg text-red-500">{error}</p>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center mt-12">
        <ShoppingCart size={64} className="text-indigo-400 mx-auto mb-6" />
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Your Cart is Empty</h2>
        <p className="text-lg text-gray-600 mb-6">
          Start shopping now to fill it up!
        </p>
        <Link
          href="/products"
          className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition duration-300 shadow-md"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  // --------------------
  // Main render
  // --------------------

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-8">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-8 flex items-center">
        <ShoppingCart size={32} className="mr-3 text-indigo-600" /> Shopping Cart
      </h1>

      {message && (
        <div className="p-3 mb-4 bg-green-100 text-green-700 rounded-lg text-sm">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => (
            <div
              key={item.productId}
              className="flex flex-col sm:flex-row items-center bg-white p-4 rounded-xl shadow-lg hover:shadow-xl transition duration-300"
            >
              <Image
                width={80}
                height={80}
                src={
                  item.imageUrl ||
                  `https://placehold.co/80x80/6366f1/ffffff?text=${item.name.substring(
                    0,
                    1,
                  )}`
                }
                alt={item.name}
                className="object-cover rounded-lg mr-4 flex-shrink-0 mb-4 sm:mb-0"
                unoptimized
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = `https://placehold.co/80x80/6366f1/ffffff?text=${item.name.substring(
                    0,
                    1,
                  )}`;
                }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-gray-800 truncate">
                  {item.name}
                </h3>
                <p className="text-sm text-gray-500">
                  Price: ${item.price.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center space-x-2 my-4 sm:my-0 sm:ml-4">
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  className="p-1 text-indigo-600 hover:text-indigo-800 disabled:text-gray-400 disabled:cursor-not-allowed transition"
                  aria-label="Decrease quantity"
                >
                  <MinusCircle size={24} />
                </button>
                <span className="w-8 text-center font-bold text-gray-700">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  className="p-1 text-indigo-600 hover:text-indigo-800 transition"
                  aria-label="Increase quantity"
                >
                  <PlusCircle size={24} />
                </button>
              </div>
              <div className="w-24 text-right font-bold text-gray-900 text-lg sm:ml-4">
                ${calculateSubtotal(item).toFixed(2)}
              </div>
              <button
                onClick={() => removeItem(item.productId)}
                className="p-1 text-red-500 hover:text-red-700 transition mt-4 sm:mt-0 sm:ml-6"
                aria-label="Remove item"
              >
                <Trash2 size={24} />
              </button>
            </div>
          ))}
        </div>

        {/* Order Summary & Coupon */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-2xl sticky top-24 border border-indigo-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-3">
              Order Summary
            </h2>

            {/* Coupon Form */}
            <form onSubmit={applyCoupon} className="mb-4 pt-2">
              <h3 className="font-semibold text-gray-700 mb-2 flex items-center">
                <Tag size={18} className="mr-1 text-indigo-500" /> Coupon Code
              </h3>
              <div className="flex">
                <input
                  type="text"
                  placeholder="Enter code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-l-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={couponLoading || !!couponApplied}
                />
                <button
                  type="submit"
                  className={`p-2 font-semibold text-sm rounded-r-lg transition ${
                    couponLoading || !!couponApplied
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                  disabled={couponLoading || !!couponApplied}
                >
                  {couponApplied
                    ? 'Applied'
                    : couponLoading
                    ? 'Applying...'
                    : 'Apply'}
                </button>
              </div>
              {couponError && (
                <p className="text-red-500 text-xs mt-1">{couponError}</p>
              )}
              {couponApplied && (
                <p className="text-green-600 text-xs mt-1 font-medium">
                  Code <span className="font-bold">{couponApplied.code}</span> applied! $
                  {couponApplied.discount.toFixed(2)} off.
                </p>
              )}
            </form>

            <div className="space-y-3 pt-3 border-t">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({cart.items.length} items)</span>
                <span>${subtotalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping Fee</span>
                <span>${SHIPPING_FEE.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax ({TAX_RATE * 100}%)</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>

              {effectiveDiscount > 0 && (
                <div className="flex justify-between font-semibold text-green-600">
                  <span>
                    Discount ({couponApplied?.code || cart.couponCode || 'Coupon'})
                  </span>
                  <span>- ${effectiveDiscount.toFixed(2)}</span>
                </div>
              )}

              <div className="pt-4 border-t border-indigo-200">
                <div className="flex justify-between text-xl font-extrabold text-indigo-600">
                  <span>Order Total</span>
                  <span>${finalTotalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Proceed to Checkout */}
            <Link
              href={`/checkout?orderId=${cart.orderId}&totalAmount=${finalTotalAmount.toFixed(
                2,
              )}`}
              className="mt-6 w-full flex items-center justify-center px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition duration-300 shadow-lg"
            >
              Proceed to Checkout <ArrowRight size={20} className="ml-2" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
