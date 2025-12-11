'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../lib/api'; // Use relative path
import { useAuth } from '../../lib/auth';
import { Truck, Package, Clock, User, XCircle, Loader2, RefreshCw } from 'lucide-react';
import { OrderType, DriverType } from '@/types'; // Assuming OrderType and DriverType exist

const ORDER_STATUS_COLORS: { [key: string]: string } = {
  placed: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  assigned: 'bg-blue-100 text-blue-800 border-blue-300',
  picked_up: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  delivered: 'bg-green-100 text-green-800 border-green-300',
  pending: 'bg-gray-100 text-gray-800 border-gray-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
};

// Define an interface for combined order data
interface FulfillmentOrder extends OrderType {
    driverName?: string;
    driverId?: string;
    // Add other fields like address if available
}

export default function OrderFulfillmentPage() {
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [drivers, setDrivers] = useState<DriverType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { user } = useAuth();
  
  // NOTE: In a real system, drivers list would be a separate Logistics Service endpoint.
  // For this MVP, we will only fetch orders and mock/lookup driver data if needed.

  const fetchFulfillmentData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Fetch Orders (Filter by placed, assigned, picked_up)
      // NOTE: Using the internal endpoint or a dedicated admin endpoint is best.
      const ordersResponse: { orders: FulfillmentOrder[] } = await api('/orders/admin?statuses=placed,assigned,picked_up');
      
      // 2. Simple transformation for display
      setOrders(ordersResponse.orders.map(o => ({
          ...o,
          driverName: o.driverId ? `Driver ${o.driverId.substring(0, 8)}...` : undefined // Mock driver name
      })));

    } catch (err: any) {
      console.error('Failed to fetch fulfillment data:', err);
      setError('Failed to load fulfillment data. Check Order Service status.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFulfillmentData();
  }, [fetchFulfillmentData]);

  const handleAssignOrder = async (order: FulfillmentOrder) => {
    if (!user || order.status !== 'placed') return;

    setActionLoading(order._id);
    try {
      // NOTE: Order service should expose order details including address/customer ID
      // For this MVP, we use mock data in the body
      await api('/logistics/internal/assign', {
        method: 'POST',
        body: JSON.stringify({
          orderId: order._id,
          customerId: order.userId,
          deliveryLocation: 'Mock Customer Address' // Replace with actual order address
        }),
        baseURL: 'http://localhost:3014/api' // Explicitly call Logistics Service
      });

      // Trigger a refresh after successful assignment
      await fetchFulfillmentData();
      
    } catch (err: any) {
      alert(`Failed to assign order: ${err.message || 'No available drivers or internal error.'}`);
    } finally {
      setActionLoading(null);
    }
  };
  
  const handleCancelOrder = async (order: FulfillmentOrder) => {
    if (!user || order.status !== 'placed') return;

    setActionLoading(order._id);
    try {
      // NOTE: Admin endpoints for cancellation should be implemented in Order Service.
      // We'll use the internal endpoint for simplicity here.
      await api(`/orders/internal/status/${order._id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'cancelled' }),
      }); 

      // Trigger a refresh
      await fetchFulfillmentData();
      
    } catch (err: any) {
      alert(`Failed to cancel order: ${err.message || 'Internal error.'}`);
    } finally {
      setActionLoading(null);
    }
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="animate-spin text-indigo-600 mr-3" size={32} />
        <p className="text-xl text-gray-700">Loading fulfillment queue...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center bg-red-50 border border-red-300 rounded-lg mt-12">
        <XCircle className="text-red-600 mx-auto mb-3" size={32} />
        <h2 className="text-xl font-bold text-red-700">{error}</h2>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center">
          <Truck size={30} className="mr-3 text-indigo-600" /> Order Fulfillment Queue
        </h1>
        <button
          onClick={fetchFulfillmentData}
          className="flex items-center px-4 py-2 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 transition"
          disabled={actionLoading !== null}
        >
          <RefreshCw size={18} className="mr-2" /> Refresh
        </button>
      </div>

      <div className="space-y-6">
        {orders.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl shadow-lg mt-12">
            <Package size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800">Queue is Clear!</h2>
            <p className="text-gray-600">No placed orders are awaiting fulfillment.</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order._id} className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-indigo-500 hover:shadow-xl transition duration-300">
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-col">
                  <span className="text-sm text-gray-500">Order ID</span>
                  <span className="text-xl font-bold text-gray-900">#{order._id.substring(0, 8)}...</span>
                </div>
                <div className={`px-3 py-1 text-sm font-semibold rounded-full border ${ORDER_STATUS_COLORS[order.status]}`}>
                  {order.status.toUpperCase().replace('_', ' ')}
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-700 border-t pt-3">
                <div className='flex items-center'><User size={16} className='mr-1 text-indigo-400' /> Customer: {order.userId.substring(0, 8)}...</div>
                <div className='flex items-center'><Clock size={16} className='mr-1 text-indigo-400' /> Total: **${order.finalTotal?.toFixed(2) ?? order.totalAmount.toFixed(2)}**</div>
                <div className='flex items-center'><Truck size={16} className='mr-1 text-indigo-400' /> Driver: {order.status === 'placed' ? 'Unassigned' : order.driverName || 'N/A'}</div>
                <div className='flex items-center'><Package size={16} className='mr-1 text-indigo-400' /> Items: {order.items.length}</div>
              </div>
              
              {/* Actions */}
              <div className="mt-4 pt-4 border-t flex space-x-3">
                {order.status === 'placed' && (
                  <>
                    <button
                      onClick={() => handleAssignOrder(order)}
                      className="px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 transition disabled:bg-gray-400 flex items-center"
                      disabled={actionLoading !== null}
                    >
                      {actionLoading === order._id ? (
                        <Loader2 size={16} className='animate-spin mr-2' />
                      ) : (
                        <Truck size={16} className='mr-2' />
                      )}
                      Assign to Driver
                    </button>
                    <button
                      onClick={() => handleCancelOrder(order)}
                      className="px-4 py-2 border border-red-500 text-red-500 text-sm font-semibold rounded-lg hover:bg-red-50 transition disabled:opacity-50"
                      disabled={actionLoading !== null}
                    >
                      Cancel Order
                    </button>
                  </>
                )}
                {(order.status === 'assigned' || order.status === 'picked_up') && (
                    <span className="px-4 py-2 text-sm text-gray-500 bg-gray-100 rounded-lg">Awaiting Driver Update...</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}