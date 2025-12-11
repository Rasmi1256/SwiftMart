// frontend/web/src/lib/notifications.ts
import { useEffect, useState, useRef } from 'react';
import { useAuth, getAuthToken } from './auth';

// NOTE: Use 'ws' for WebSocket connection
const WS_URL = 'ws://localhost:3015';

export interface OrderNotification {
    type: 'order_update' | 'connection_success' | 'error';
    orderId?: string;
    status?: string;
    message: string;
    timestamp?: string;
    driverLocation?: { lat: number; lng: number };
}

export const useRealTimeNotifications = () => {
    const { user, isAuthenticated } = useAuth();
    const wsRef = useRef<WebSocket | null>(null);
    const [latestNotification, setLatestNotification] = useState<OrderNotification | null>(null);

    useEffect(() => {
        if (!isAuthenticated || !user) {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            return;
        }

        // 1. Get the current auth token
        const token = getAuthToken();

        // 2. Open WebSocket connection with the token for authentication
        const ws = new WebSocket(`${WS_URL}?token=${token}`);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('WebSocket connected.');
        };

        ws.onmessage = (event) => {
            try {
                const data: OrderNotification = JSON.parse(event.data);
                console.log('Received notification:', data);
                setLatestNotification(data);
            } catch (error) {
                console.error('Error parsing WS message:', error);
            }
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected.');
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [isAuthenticated, user]);

    return { latestNotification };
};