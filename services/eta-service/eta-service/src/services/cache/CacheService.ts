import { RedisClientType } from 'redis';

export class CacheService {
  constructor(private readonly redis: RedisClientType) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('[CacheService] GET failed', error);
      return null; // fail open
    }
  }

  async set(
    key: string,
    value: unknown,
    ttlSeconds: number
  ): Promise<void> {
    try {
      await this.redis.setEx(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      console.error('[CacheService] SET failed', error);
      // do NOT throw — cache is optional
    }
  }

  async acquireLock(key: string, ttlSeconds: number = 30): Promise<boolean> {
    try {
      const result = await this.redis.setNX(key, 'locked');
      if (result) {
        // Set expiration on the lock
        await this.redis.expire(key, ttlSeconds);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[CacheService] acquireLock failed', error);
      return false;
    }
  }

  async releaseLock(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('[CacheService] releaseLock failed', error);
      // do NOT throw — cache is optional
    }
  }
}
