// src/components/NotificationDropdown.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle, XCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { NotificationType, NotificationData } from '@/types';
import { useAuth } from '@/lib/auth';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const unreadCount = notifications.filter(n => !n.read).length;

  // Fetch notifications from the backend
  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const response: NotificationData = await api('/notifications/in-app', {
        method: 'GET',
      });
      setNotifications(response.notifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    // Fetch notifications when the component mounts and the user is authenticated
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // Handle clicks outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    // If opening, mark all notifications as read
    if (!isOpen) {
      // We'll mark them as read one by one to avoid a large batch request
      notifications.filter(n => !n.read).forEach(notif => {
        markAsRead(notif._id);
      });
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await api(`/notifications/in-app/${id}/read`, {
        method: 'PUT',
      });
      setNotifications(prev =>
        prev.map(notif => (notif._id === id ? { ...notif, read: true } : notif))
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="relative text-gray-700 hover:text-indigo-600 focus:outline-none"
        aria-label="Notifications"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full -translate-y-1/2 translate-x-1/2">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="font-semibold text-gray-800">Notifications</h3>
              <span className="text-sm text-gray-500">{unreadCount} unread</span>
            </div>
            {notifications.length > 0 ? (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`flex items-start px-4 py-3 border-b hover:bg-gray-50 cursor-pointer ${
                    !notif.read ? 'bg-indigo-50' : ''
                  }`}
                >
                  <div className="flex-shrink-0 mr-3 mt-1">
                    {notif.type === 'order_placed' && <CheckCircle className="text-green-500" size={20} />}
                    {notif.type === 'order_status_update' && <CheckCircle className="text-blue-500" size={20} />}
                    {notif.type === 'order_delivered' && <CheckCircle className="text-green-500" size={20} />}
                    {notif.type === 'delivery_failed' && <XCircle className="text-red-500" size={20} />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm ${!notif.read ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                      {notif.message}
                    </p>
                    <span className="text-xs text-gray-400">
                      {formatDate(notif.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">No new notifications.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}