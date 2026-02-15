import { createClient, RedisClientType } from 'redis';
import * as h3 from 'h3-js';
import { config } from '../config';

interface HeatmapCell {
  h3Index: string;
  orderInflowRate: number;
  partnerAvailability: number;
  avgETA: number;
  surgeIndex: number;
  lastUpdated: Date;
}

export class HeatmapService {
  private redisClient: RedisClientType;

  constructor() {
    this.redisClient = createClient({ url: config.redisUrl });
    this.redisClient.connect();
  }

  /**
   * Record an order event for heatmap calculation
   */
  async recordOrderEvent(lat: number, lng: number, orderId: string): Promise<void> {
    const h3Index = h3.latLngToCell(lat, lng, config.h3Resolution);
    const key = `heatmap:orders:${h3Index}`;
    const timestamp = Date.now();

    // Add order event with timestamp
    await this.redisClient.zAdd(key, { score: timestamp, value: orderId });

    // Clean old events (older than window)
    const cutoffTime = timestamp - (config.heatmapWindowMinutes * 60 * 1000);
    await this.redisClient.zRemRangeByScore(key, 0, cutoffTime);
  }

  /**
   * Record partner availability in a cell
   */
  async recordPartnerAvailability(lat: number, lng: number, partnerId: string, available: boolean): Promise<void> {
    const h3Index = h3.latLngToCell(lat, lng, config.h3Resolution);
    const key = `heatmap:partners:${h3Index}`;

    if (available) {
      await this.redisClient.sAdd(key, partnerId);
    } else {
      await this.redisClient.sRem(key, partnerId);
    }
  }

  /**
   * Calculate surge index for a location
   */
  async calculateSurgeIndex(lat: number, lng: number): Promise<number> {
    const h3Index = h3.latLngToCell(lat, lng, config.h3Resolution);

    // Get order inflow rate (orders per minute in the window)
    const orderKey = `heatmap:orders:${h3Index}`;
    const orderCount = await this.redisClient.zCard(orderKey);
    const orderInflowRate = orderCount / config.heatmapWindowMinutes;

    // Get partner availability
    const partnerKey = `heatmap:partners:${h3Index}`;
    const partnerCount = await this.redisClient.sCard(partnerKey);

    // Calculate surge index: demand / supply
    const baseDemand = Math.max(orderInflowRate, 1); // Avoid division by zero
    const baseSupply = Math.max(partnerCount, 1);
    const surgeIndex = baseDemand / baseSupply;

    // Cache the result
    const cacheKey = `heatmap:surge:${h3Index}`;
    await this.redisClient.setEx(cacheKey, 300, surgeIndex.toString()); // Cache for 5 minutes

    return surgeIndex;
  }

  /**
   * Get heatmap data for a region
   */
  async getHeatmapData(centerLat: number, centerLng: number, radiusKm: number = 5): Promise<HeatmapCell[]> {
    const centerH3 = h3.latLngToCell(centerLat, centerLng, config.h3Resolution);
    const ringH3 = h3.gridDisk(centerH3, Math.ceil(radiusKm / 1.5)); // Approximate ring size

    const heatmapData: HeatmapCell[] = [];

    for (const h3Index of ringH3) {
      const cellLatLng = h3.cellToLatLng(h3Index);
      const surgeIndex = await this.calculateSurgeIndex(cellLatLng[0], cellLatLng[1]);

      // Get additional metrics
      const orderKey = `heatmap:orders:${h3Index}`;
      const orderCount = await this.redisClient.zCard(orderKey);
      const orderInflowRate = orderCount / config.heatmapWindowMinutes;

      const partnerKey = `heatmap:partners:${h3Index}`;
      const partnerCount = await this.redisClient.sCard(partnerKey);

      heatmapData.push({
        h3Index,
        orderInflowRate,
        partnerAvailability: partnerCount,
        avgETA: this.estimateAvgETA(surgeIndex),
        surgeIndex,
        lastUpdated: new Date(),
      });
    }

    return heatmapData;
  }

  /**
   * Check if location is in surge zone
   */
  async isInSurgeZone(lat: number, lng: number): Promise<boolean> {
    const surgeIndex = await this.calculateSurgeIndex(lat, lng);
    return surgeIndex >= config.surgeThreshold;
  }

  /**
   * Get surge multiplier for scoring
   */
  async getSurgeMultiplier(lat: number, lng: number): Promise<number> {
    const surgeIndex = await this.calculateSurgeIndex(lat, lng);
    // Higher surge = higher priority for partners in that area
    return Math.min(surgeIndex, 3.0); // Cap at 3x multiplier
  }

  private estimateAvgETA(surgeIndex: number): number {
    // Simplified ETA estimation based on surge
    const baseETA = 25; // minutes
    return baseETA * (1 + (surgeIndex - 1) * 0.5); // 50% increase per surge point
  }

  async close(): Promise<void> {
    await this.redisClient.quit();
    return;
  }

 async updateHeatmap(
  lat: number, 
  lng: number, 
  orderInflow: number, 
  partnerAvailability: number
): Promise<void> {
  const h3Index = h3.latLngToCell(lat, lng, config.h3Resolution);
  
  // 1. Update Order Inflow in Redis
  const orderKey = `heatmap:orders:${h3Index}`;
  // We use a dummy score/value just to represent the current rate if needed
  await this.redisClient.set(`${orderKey}:rate`, orderInflow.toString());

  // 2. Update Partner Availability
  const partnerKey = `heatmap:partners:${h3Index}:count`;
  await this.redisClient.set(partnerKey, partnerAvailability.toString());

  // 3. Recalculate the surge cache immediately
  await this.calculateSurgeIndex(lat, lng);
}
}
