// src/app/checkout/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import AuthGuard from '@/components/AuthGuard';
import LoadingSpinner from '@/components/LoadingSpinner';
import { Order, Address, ProfileResponse, PlaceOrderPayload } from '@/types';

export default function CheckoutPage() {
  const [cart, setCart] = useState<Order | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('COD'); // Default to Cash on Delivery
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch cart
        const cartResponse = await api<{ message: string; cart: Order | null }>('/cart');
        if (!cartResponse.cart || cartResponse.cart.items.length === 0) {
          setError('Your cart is empty. Please add items before checking out.');
          setLoading(false);
          return;
        }
        setCart(cartResponse.cart);

        // Fetch user addresses
        const profileResponse: ProfileResponse = await api('/users/profile');
        setAddresses(profileResponse.addresses);
        // Set default address if available
        const defaultAddress = profileResponse.addresses.find(addr => addr.isDefault);
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
        } else if (profileResponse.addresses.length > 0) {
          setSelectedAddressId(profileResponse.addresses[0].id); // Select first if no default
        }

      } catch (err: any) {
        setError(err.message || 'Failed to load checkout data.');
        console.error('Checkout data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handlePlaceOrder = async () => {
    if (!cart || cart.total_amount <= 0) {
      setError('Cannot place an empty order.');
      return;
    }
    if (!selectedAddressId) {
      setError('Please select a shipping address.');
      return;
    }
    if (!paymentMethod) {
      setError('Please select a payment method.');
      return;
    }

    setPlacingOrder(true);
    setError(null);

    try {
      const payload: PlaceOrderPayload = {
        shippingAddressId: selectedAddressId,
        paymentMethod: paymentMethod,
      };
      const response = await api<{ message: string; order: Order }>('/orders/place', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      router.push(`/orders/${response.order.id}`); // Redirect to order confirmation page
    } catch (err: any) {
      setError(err.message || 'Failed to place order. Please try again.');
      console.error('Place order error:', err);
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error && (!cart || cart.items.length === 0)) {
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
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Checkout</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <span className="block sm:inline">{error}</span>
            </div>
          )}

          {cart && cart.items.length > 0 ? (
            <>
              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">Order Summary</h2>
                <div className="space-y-3">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center text-gray-700">
                      <span>{item.product_name} (x{item.quantity})</span>
                      <span>${(item.unit_price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center font-bold text-xl text-gray-800 border-t pt-3 mt-3">
                    <span>Total:</span>
                    <span>${cart.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">Shipping Address</h2>
                {addresses.length === 0 ? (
                  <p className="text-gray-600 mb-4">No addresses found. Please add one in your <Link href="/dashboard" className="text-indigo-600 hover:underline">profile</Link>.</p>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((address) => (
                      <label key={address.id} className="flex items-center p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="shippingAddress"
                          value={address.id}
                          checked={selectedAddressId === address.id}
                          onChange={() => setSelectedAddressId(address.id)}
                          className="form-radio h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                        />
                        <span className="ml-3 text-gray-700">
                          {address.addressLine1}, {address.city}, {address.state} {address.zipCode}
                          {address.isDefault && <span className="ml-2 text-xs font-medium text-green-600">(Default)</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">Payment Method</h2>
                <div className="space-y-3">
                  <label className="flex items-center p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="COD"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                      className="form-radio h-4 w-4 text-indigo-600 transition duration-150 ease-in-out"
                    />
                    <span className="ml-3 text-gray-700">Cash on Delivery (COD)</span>
                  </label>
                  {/* Add other payment methods here later */}
                  <label className="flex items-center p-3 border border-gray-200 rounded-md cursor-not-allowed bg-gray-100">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="Card"
                      checked={paymentMethod === 'Card'}
                      disabled // Disable for MVP
                      className="form-radio h-4 w-4 text-gray-400 transition duration-150 ease-in-out"
                    />
                    <span className="ml-3 text-gray-400">Credit/Debit Card (Coming Soon)</span>
                  </label>
                </div>
              </section>

              <button
                onClick={handlePlaceOrder}
                disabled={placingOrder || !selectedAddressId || !paymentMethod}
                className="w-full py-3 px-6 bg-indigo-600 text-white font-semibold rounded-md shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {placingOrder ? 'Placing Order...' : `Place Order - $${cart.total_amount.toFixed(2)}`}
              </button>
            </>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-600 text-lg mb-4">Your cart is empty. Please add items before checking out.</p>
              <Link href="/products" className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                Start Shopping
              </Link>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}