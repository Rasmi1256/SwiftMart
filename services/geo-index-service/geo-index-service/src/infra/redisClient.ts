import { createClient, RedisClientType } from 'redis';
import { config } from '../config';

export class RedisClientFactory {
  private static instance: RedisClientType | null = null;

  /**
   * Create and connect Redis client with proper error handling
   */
  static async createClient(): Promise<RedisClientType> {
    if (this.instance) {
      return this.instance;
    }

    try {
      const client = createClient({
        url: config.redisUrl,
        socket: {
          connectTimeout: 60000,
        },
      }) as any;

      // Set up error handling
      client.on('error', (err: any) => {
        console.error('Redis Client Error:', err);
      });

      client.on('connect', () => {
        console.log('Connected to Redis');
      });

      client.on('ready', () => {
        console.log('Redis client ready');
      });

      client.on('end', () => {
        console.log('Redis connection ended');
      });

      await client.connect();
      this.instance = client as RedisClientType;
      return this.instance;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Get existing client instance
   */
  static getInstance(): RedisClientType | null {
    return this.instance;
  }

  /**
   * Close and cleanup client
   */
  static async closeClient(): Promise<void> {
    if (this.instance) {
      await this.instance.quit();
      this.instance = null;
    }
  }
}

// Export for backward compatibility - will be removed after refactoring
export const redisClient = await RedisClientFactory.createClient();
