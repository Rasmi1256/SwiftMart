import { createClient, RedisClientType } from 'redis';
import { config } from '../config';

let redisClient: RedisClientType | null = null;

export async function initRedis(): Promise<RedisClientType> {
  if (redisClient) {
    return redisClient;
  }

  redisClient = createClient({
    url: config.redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        // Exponential backoff (max 30s)
        return Math.min(retries * 100, 30000);
      }
    }
  });

  redisClient.on('connect', () => {
    console.log('[Redis] Connected');
  });

  redisClient.on('error', (err) => {
    console.error('[Redis] Error', err);
  });

  redisClient.on('reconnecting', () => {
    console.warn('[Redis] Reconnecting...');
  });

  await redisClient.connect();

  return redisClient;
}

export async function shutdownRedis(): Promise<void> {
  if (redisClient) {
    console.log('[Redis] Shutting down');
    await redisClient.quit();
    redisClient = null;
  }
}
