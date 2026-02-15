import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { redisClient, publishLocationUpdate } from './redis';

interface AuthenticatedWebSocket extends WebSocket {
  partnerId?: string;
  orderId?: string;
  isAlive?: boolean;
}

interface LocationMessage {
  partnerId: string;
  orderId?: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  timestamp: number;
}

class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map(); // orderId -> clients
  private heartbeatInterval: NodeJS.Timeout;

  constructor(server: any) {
    this.wss = new WebSocketServer({
      server,
      path: '/ws/location',
      perMessageDeflate: false,
    });

    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: AuthenticatedWebSocket, request: IncomingMessage) => {
      console.log('New WebSocket connection attempt');

      // Authenticate connection
      const url = new URL(request.url || '', 'http://localhost');
      const token = url.searchParams.get('token');
      const partnerId = url.searchParams.get('partnerId');
      const orderId = url.searchParams.get('orderId');

      if (!token || !partnerId) {
        ws.close(1008, 'Missing authentication parameters');
        return;
      }

      try {
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret') as any;

        if (decoded.driverId !== partnerId) {
          ws.close(1008, 'Invalid partner authentication');
          return;
        }

        // Authenticate WebSocket
        ws.partnerId = partnerId;
        ws.orderId = orderId || undefined;
        ws.isAlive = true;

        // Add to clients map
        if (orderId) {
          if (!this.clients.has(orderId)) {
            this.clients.set(orderId, new Set());
          }
          this.clients.get(orderId)!.add(ws);
        }

        console.log(`WebSocket authenticated for partner: ${partnerId}, order: ${orderId}`);

        // Handle messages
        ws.on('message', (data: Buffer) => {
          try {
            const message: LocationMessage = JSON.parse(data.toString());

            // Validate message
            if (message.partnerId !== partnerId) {
              ws.send(JSON.stringify({ error: 'Partner ID mismatch' }));
              return;
            }

            // Process location update
            this.handleLocationUpdate(message);

          } catch (error) {
            console.error('Invalid message format:', error);
            ws.send(JSON.stringify({ error: 'Invalid message format' }));
          }
        });

        ws.on('pong', () => {
          ws.isAlive = true;
        });

        ws.on('close', () => {
          console.log(`WebSocket closed for partner: ${partnerId}`);
          // Remove from clients map
          if (orderId && this.clients.has(orderId)) {
            this.clients.get(orderId)!.delete(ws);
            if (this.clients.get(orderId)!.size === 0) {
              this.clients.delete(orderId);
            }
          }
        });

        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
        });

      } catch (error) {
        console.error('WebSocket authentication failed:', error);
        ws.close(1008, 'Authentication failed');
      }
    });
  }

  private async handleLocationUpdate(message: LocationMessage) {
    try {
      // Cache location in Redis
      const locationKey = `location:${message.partnerId}`;
      const locationData = {
        partnerId: message.partnerId,
        orderId: message.orderId,
        lat: message.lat,
        lng: message.lng,
        speed: message.speed,
        heading: message.heading,
        accuracy: message.accuracy,
        timestamp: message.timestamp,
        confidence: 'ACTUAL'
      };

      await redisClient.setEx(locationKey, 300, JSON.stringify(locationData)); // 5 minutes TTL

      // Publish to Redis pub/sub for fan-out
      await publishLocationUpdate(message.orderId || 'general', locationData);

      // Broadcast to WebSocket clients for this order
      if (message.orderId && this.clients.has(message.orderId)) {
        const clients = this.clients.get(message.orderId)!;
        const broadcastMessage = JSON.stringify({
          type: 'location_update',
          data: locationData
        });

        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcastMessage);
          }
        });
      }

      console.log(`Location updated for partner ${message.partnerId}`);

    } catch (error) {
      console.error('Error handling location update:', error);
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
        if (!ws.isAlive) {
          return ws.terminate();
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds
  }

  // Method to broadcast location updates to specific order clients
  public broadcastToOrder(orderId: string, data: any) {
    if (this.clients.has(orderId)) {
      const clients = this.clients.get(orderId)!;
      const message = JSON.stringify(data);

      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  }

  public getConnectedClientsCount(): number {
    return this.wss.clients.size;
  }

  public close() {
    clearInterval(this.heartbeatInterval);
    this.wss.close();
  }
}

export default WebSocketManager;
