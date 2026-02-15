import { createClient, RedisClientType } from 'redis';
import { config } from './config';

class RedisManager {
  private cacheClient: RedisClientType;
  private pubClient: RedisClientType;
  private subClient: RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    const redisUrl = config.redisUrl;

    // Client for caching operations
    this.cacheClient = createClient({ url: redisUrl });

    // Separate clients for pub/sub to avoid blocking
    this.pubClient = createClient({ url: redisUrl });
    this.subClient = createClient({ url: redisUrl });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    const clients = [this.cacheClient, this.pubClient, this.subClient];

    clients.forEach((client, index) => {
      const clientName = ['cache', 'pub', 'sub'][index];

      client.on('error', (err) => {
        console.error(`Redis ${clientName} client error:`, err);
      });

      client.on('connect', () => {
        console.log(`Redis ${clientName} client connected`);
      });

      client.on('ready', () => {
        console.log(`Redis ${clientName} client ready`);
      });

      client.on('end', () => {
        console.log(`Redis ${clientName} client disconnected`);
      });
    });
  }

  async connect(): Promise<void> {
    try {
      await Promise.all([
        this.cacheClient.connect(),
        this.pubClient.connect(),
        this.subClient.connect()
      ]);
      this.isConnected = true;
      console.log('All Redis clients connected successfully');
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await Promise.all([
        this.cacheClient.disconnect(),
        this.pubClient.disconnect(),
        this.subClient.disconnect()
      ]);
      this.isConnected = false;
      console.log('All Redis clients disconnected');
    } catch (error) {
      console.error('Error disconnecting Redis clients:', error);
    }
  }

  // Cache operations
  async get(key: string): Promise<string | null> {
    return await this.cacheClient.get(key);
  }

  async set(key: string, value: string): Promise<void> {
    await this.cacheClient.set(key, value);
  }

  async setEx(key: string, ttlSeconds: number, value: string): Promise<void> {
    await this.cacheClient.setEx(key, ttlSeconds, value);
  }

  async del(key: string): Promise<number> {
    return await this.cacheClient.del(key);
  }

  async exists(key: string): Promise<number> {
    return await this.cacheClient.exists(key);
  }

  // Pub/Sub operations
  async publish(channel: string, message: string): Promise<number> {
    return await this.pubClient.publish(channel, message);
  }

  async subscribe(channel: string, callback: (message: string, channel: string) => void): Promise<void> {
    await this.subClient.subscribe(channel, callback);
  }

  async unsubscribe(channel: string): Promise<void> {
    await this.subClient.unsubscribe(channel);
  }

  // Location-specific operations
  async cachePartnerLocation(partnerId: string, locationData: any, ttlSeconds: number = 300): Promise<void> {
    const key = `location:${partnerId}`;
    await this.setEx(key, ttlSeconds, JSON.stringify(locationData));
  }

  async getPartnerLocation(partnerId: string): Promise<any | null> {
    const key = `location:${partnerId}`;
    const data = await this.get(key);
    return data ? JSON.parse(data) : null;
  }

  async publishLocationUpdate(orderId: string, locationData: any): Promise<number> {
    const channel = `order:${orderId}`;
    return await this.publish(channel, JSON.stringify({
      type: 'location_update',
      data: locationData,
      timestamp: Date.now()
    }));
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const result = await this.cacheClient.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis ping failed:', error);
      return false;
    }
  }

  get isReady(): boolean {
    return this.isConnected;
  }

  get client(): RedisClientType {
    return this.cacheClient;
  }
}

// Singleton instance
const redisManager = new RedisManager();

// Export the manager instance and convenience functions
export const redisClient = redisManager.client;
export const connectRedis = () => redisManager.connect();
export const disconnectRedis = () => redisManager.disconnect();
export const publishLocationUpdate = (orderId: string, data: any) => redisManager.publishLocationUpdate(orderId, data);
export const cachePartnerLocation = (partnerId: string, data: any, ttl?: number) => redisManager.cachePartnerLocation(partnerId, data, ttl);
export const getPartnerLocation = (partnerId: string) => redisManager.getPartnerLocation(partnerId);

export default redisManager;
