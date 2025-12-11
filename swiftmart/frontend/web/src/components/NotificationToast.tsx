'use client';

import { useEffect, useState } from 'react';
import { useRealTimeNotifications } from '../lib/notifications';

export default function NotificationToast() {
  const { latestNotification } = useRealTimeNotifications();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (latestNotification && latestNotification.type === 'order_update') {
      const { orderId, status, message } = latestNotification;
      setToastMessage(message);
      setShowToast(true);

      const timer = setTimeout(() => setShowToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [latestNotification]);

  if (!showToast) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 p-4 bg-indigo-600 text-white rounded-lg shadow-xl max-w-sm">
      <div className="font-bold mb-1">📢 Order Update</div>
      <p className="text-sm">{toastMessage}</p>
      <button onClick={() => setShowToast(false)} className="absolute top-1 right-2 text-white/80 hover:text-white">
        &times;
      </button>
    </div>
  );
}
