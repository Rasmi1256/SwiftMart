import { RedisClientType } from 'redis';
import * as h3 from 'h3-js';
import { config } from '../config';

export interface DriverStatus {
  available: boolean;
  vehicleType?: string;
  onDuty: boolean;
}

export class GeoIndexService {
  private redisClient: RedisClientType;

  constructor(redisClient: RedisClientType) {
    this.redisClient = redisClient;
  }

  /**
   * Index a driver's location using H3 with atomic operations and heartbeat
   */
  async indexDriverLocation(
    driverId: string,
    lat: number,
    lng: number,
    status: DriverStatus = { available: true, onDuty: true }
  ): Promise<void> {
    const startTime = Date.now();
    try {
      const h3Index = h3.latLngToCell(lat, lng, config.h3Resolution);
      const h3Key = `drivers:geo:${h3Index}`;
      const driverH3Key = `driver:${driverId}:h3`;
      const driverStatusKey = `driver:${driverId}:status`;
      const heartbeatKey = `driver:${driverId}:heartbeat`;

      // Atomic operation: Update H3 index, GEO cache, and metadata
      await this.redisClient.multi()
        .sAdd(h3Key, driverId)
        .set(driverH3Key, h3Index)
        .geoAdd('drivers:locations', {
          longitude: lng,
          latitude: lat,
          member: driverId,
        })
        .hSet(driverStatusKey, {
          available: status.available ? '1' : '0',
          vehicleType: status.vehicleType || 'car',
          onDuty: status.onDuty ? '1' : '0',
          lastUpdate: Date.now().toString(),
        })
        .setEx(heartbeatKey, config.heartbeatTTL, '1')
        .exec();

      console.log(`Indexed driver ${driverId} at H3:${h3Index}, took ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error(`Failed to index driver ${driverId}:`, error);
      throw error;
    }
  }

  /**
   * Remove driver from index using stored H3 mapping
   */
  async removeDriverLocation(driverId: string): Promise<void> {
    const startTime = Date.now();
    try {
      const driverH3Key = `driver:${driverId}:h3`;
      const driverStatusKey = `driver:${driverId}:status`;
      const heartbeatKey = `driver:${driverId}:heartbeat`;

      // Get stored H3 index
      const h3Index = await this.redisClient.get(driverH3Key);
      if (!h3Index) {
        console.warn(`No H3 index found for driver ${driverId}`);
        return;
      }

      const h3Key = `drivers:geo:${h3Index}`;

      // Atomic cleanup
      await this.redisClient.multi()
        .sRem(h3Key, driverId)
        .del(driverH3Key)
        .zRem('drivers:locations', driverId)
        .del(driverStatusKey)
        .del(heartbeatKey)
        .exec();

      console.log(`Removed driver ${driverId} from H3:${h3Index}, took ${Date.now() - startTime}ms`);
    } catch (error) {
      console.error(`Failed to remove driver ${driverId}:`, error);
      throw error;
    }
  }

  /**
   * Find nearby drivers within radius with exact distance filtering and status checks
   */
  async findNearbyDrivers(
    lat: number,
    lng: number,
    radiusKm: number = 3,
    requiredStatus: Partial<DriverStatus> = { available: true, onDuty: true }
  ): Promise<string[]> {
    const startTime = Date.now();
    try {
      const centerH3 = h3.latLngToCell(lat, lng, config.h3Resolution);
      const ringH3 = h3.gridDisk(centerH3, Math.ceil(radiusKm / 1.5));

      // Parallel Redis queries for better performance
      const promises = ringH3.map(h3Index =>
        this.redisClient.sMembers(`drivers:geo:${h3Index}`)
      );

      const driverSets = await Promise.all(promises);
      const uniqueDrivers = [...new Set(driverSets.flat())];

      // Filter by exact distance and status
      const filteredDrivers: string[] = [];
      const center = { lat, lng };

      for (const driverId of uniqueDrivers) {
        try {
          // Check driver status first (fast Redis operation)
          if (requiredStatus.available !== undefined || requiredStatus.onDuty !== undefined) {
            const status = await this.getDriverStatus(driverId);
            if (!status) continue;

            if (requiredStatus.available !== undefined && status.available !== requiredStatus.available) continue;
            if (requiredStatus.onDuty !== undefined && status.onDuty !== requiredStatus.onDuty) continue;
            if (requiredStatus.vehicleType && status.vehicleType !== requiredStatus.vehicleType) continue;
          }

          // Get location and check distance
          const location = await this.getDriverLocation(driverId);
          if (!location) continue;

          const distance = this.calculateDistance(
            center.lat, center.lng,
            location.lat, location.lng
          );

          if (distance <= radiusKm) {
            filteredDrivers.push(driverId);
          }
        } catch (error) {
          console.warn(`Error checking driver ${driverId}:`, error);
          continue;
        }
      }

      console.log(`Found ${filteredDrivers.length} drivers within ${radiusKm}km, took ${Date.now() - startTime}ms`);
      return filteredDrivers;
    } catch (error) {
      console.error('Failed to find nearby drivers:', error);
      throw error;
    }
  }

  /**
   * Get driver location from GEO cache
   */
  async getDriverLocation(driverId: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const result = await this.redisClient.geoPos('drivers:locations', driverId);
      if (result && result.length > 0 && result[0]) {
        return { lat: Number(result[0].latitude), lng: Number(result[0].longitude) };
      }
      return null;
    } catch (error) {
      console.error(`Failed to get location for driver ${driverId}:`, error);
      return null;
    }
  }

  /**
   * Get driver status
   */
  async getDriverStatus(driverId: string): Promise<DriverStatus | null> {
    try {
      const statusData = await this.redisClient.hGetAll(`driver:${driverId}:status`);
      if (!statusData || Object.keys(statusData).length === 0) {
        return null;
      }

      return {
        available: statusData.available === '1',
        vehicleType: statusData.vehicleType,
        onDuty: statusData.onDuty === '1',
      };
    } catch (error) {
      console.error(`Failed to get status for driver ${driverId}:`, error);
      return null;
    }
  }

  /**
   * Update driver heartbeat
   */
  async updateDriverHeartbeat(driverId: string): Promise<void> {
    try {
      await this.redisClient.setEx(`driver:${driverId}:heartbeat`, config.heartbeatTTL, '1');
    } catch (error) {
      console.error(`Failed to update heartbeat for driver ${driverId}:`, error);
      throw error;
    }
  }

  /**
   * Clean up expired drivers (should be called periodically)
   */
  async cleanupExpiredDrivers(): Promise<number> {
    const startTime = Date.now();
    try {
      // This is a simplified cleanup - in production, you'd use Redis keyspace notifications
      // or a more sophisticated cleanup mechanism
      const keys = await this.redisClient.keys('driver:*:heartbeat');
      let cleanedCount = 0;

      for (const key of keys) {
        const driverId = key.split(':')[1];
        const exists = await this.redisClient.exists(key);
        if (!exists) {
          await this.removeDriverLocation(driverId);
          cleanedCount++;
        }
      }

      console.log(`Cleaned up ${cleanedCount} expired drivers, took ${Date.now() - startTime}ms`);
      return cleanedCount;
    } catch (error) {
      console.error('Failed to cleanup expired drivers:', error);
      throw error;
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get service metrics
   */
  async getMetrics(): Promise<{
    totalDrivers: number;
    activeDrivers: number;
    h3Cells: number;
  }> {
    try {
      const [totalDrivers, activeDrivers, h3Cells] = await Promise.all([
        this.redisClient.zCard('drivers:locations'),
        this.redisClient.keys('driver:*:heartbeat').then(keys => keys.length),
        this.redisClient.keys('drivers:geo:*').then(keys => keys.length),
      ]);

      return { totalDrivers, activeDrivers, h3Cells };
    } catch (error) {
      console.error('Failed to get metrics:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    // Note: Don't close the client here as it's managed externally
    console.log('GeoIndexService closed');
  }
}
