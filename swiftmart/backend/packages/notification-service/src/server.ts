import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import jwt from 'jsonwebtoken';
import { config } from './config';
import notificationRoutes from './routes/notificationRoutes';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Map to hold connected users (userId -> WebSocket)
const clients = new Map<string, WebSocket>();

// Middleware to parse internal messages (HTTP only)
app.use(express.json());

// Add existing notification routes
app.use('/api/notifications', notificationRoutes);

// Basic error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke in Notification Service!');
});

// --- 1. WebSocket Authentication and Connection ---

wss.on('connection', (ws, req) => {
    // Extract token from URL query params (e.g., ws://localhost:3015?token=...)
    const url = new URL(req.url || '/', `ws://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
        ws.send(JSON.stringify({ type: 'error', message: 'Authentication token required.' }));
        ws.close();
        return;
    }

    if (!config.jwtSecret) {
        console.error('JWT_SECRET is not defined. Cannot verify token.');
        ws.send(JSON.stringify({ type: 'error', message: 'Internal server error.' }));
        ws.close();
        return;
    }

    try {
        // Verify and decode JWT
        const decodedPayload = jwt.verify(token, config.jwtSecret);

        // Safely check the type and shape of the decoded payload
        if (typeof decodedPayload === 'string' || !decodedPayload?.id || !decodedPayload?.role) {
            throw new Error('Invalid token payload');
        }

        const userId = decodedPayload.id;

        // Store authenticated client
        clients.set(userId, ws);
        console.log(`Client connected: ${userId}`);
        ws.send(JSON.stringify({ type: 'connection_success', message: `Welcome, ${decodedPayload.role}.` }));

        ws.on('close', () => {
            clients.delete(userId);
            console.log(`Client disconnected: ${userId}`);
        });

    } catch (err) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid or expired token.' }));
        ws.close();
    }
});

// --- 2. HTTP Endpoint for Internal Notifications ---

// @route   POST /api/notifications/broadcast
// @access  Internal (Order Service will call this)
app.post('/api/notifications/broadcast', (req, res) => {
    const { userId, orderId, newStatus, message, driverLocation } = req.body;

    if (!userId || !orderId || !newStatus) {
        return res.status(400).json({ message: 'Missing required fields: userId, orderId, newStatus.' });
    }

    // Construct the notification payload
    const payload = JSON.stringify({
        type: 'order_update',
        orderId,
        status: newStatus,
        message: message || `Order ${orderId} is now ${newStatus.toUpperCase().replace('_', ' ')}.`,
        timestamp: new Date().toISOString(),
        driverLocation: driverLocation, // Optional: for tracking
    });

    // Find the recipient and send the message
    const clientWs = clients.get(userId);
    if (clientWs && clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(payload);
        console.log(`Notification sent to ${userId} for order ${orderId}: ${newStatus}`);
        return res.status(200).json({ message: 'Notification sent successfully.' });
    } else {
        // In a real app, this would queue the notification for the user to see upon login.
        return res.status(202).json({ message: 'User offline, notification not sent in real-time.' });
    }
});
// --- 3. Start Server and Connect to DB ---
import prisma from './db';

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('Database connection established successfully.');

    app.listen(config.port, () => {
      console.log(`User Service running on port ${config.port}`);
      console.log(`Access at http://localhost:${config.port}/api/notifications`);
    });
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
  }
};

startServer();