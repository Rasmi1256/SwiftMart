import { createClient, RedisClientType } from 'redis';
import { config } from '../config';

interface ETAResponse {
  etaMinutes: number;
  distanceKm: number;
  travelTimeMinutes: number;
  prepTimeMinutes: number;
  bufferTimeMinutes: number;
}

interface ETARequest {
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
  prepTimeMinutes: number;
  vehicleType: string;
  timeOfDay: string; // e.g., "morning", "afternoon", "evening", "night"
  dayOfWeek: string; // e.g., "monday", "tuesday", etc.
}

export class ETAService {
  private redisClient: RedisClientType;

  constructor() {
    this.redisClient = createClient({ url: config.redisUrl });
    this.redisClient.connect();
  }

  /**
   * Calculate ETA for a delivery
   */
  async predictETA(request: ETARequest): Promise<ETAResponse> {
    const cacheKey = this.generateCacheKey(request);

    // Check cache first
    const cached = await this.redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Calculate distance using Haversine formula
    const distanceKm = this.calculateDistance(
      request.pickupLat,
      request.pickupLng,
      request.dropLat,
      request.dropLng
    );

    // Get traffic multiplier based on time and location
    const trafficMultiplier = await this.getTrafficMultiplier(
      request.timeOfDay,
      request.dayOfWeek,
      request.pickupLat,
      request.pickupLng
    );

    // Get vehicle speed profile
    const avgSpeedKmh = this.getVehicleSpeed(request.vehicleType);

    // Calculate travel time with traffic
    const baseTravelTime = (distanceKm / avgSpeedKmh) * 60; // minutes
    const travelTimeMinutes = baseTravelTime * trafficMultiplier;

    // Add buffer time based on distance and time of day
    const bufferTimeMinutes = this.calculateBufferTime(distanceKm, request.timeOfDay);

    // Total ETA
    const etaMinutes = travelTimeMinutes + request.prepTimeMinutes + bufferTimeMinutes;

    const response: ETAResponse = {
      etaMinutes: Math.ceil(etaMinutes),
      distanceKm: Math.round(distanceKm * 100) / 100,
      travelTimeMinutes: Math.ceil(travelTimeMinutes),
      prepTimeMinutes: request.prepTimeMinutes,
      bufferTimeMinutes: Math.ceil(bufferTimeMinutes),
    };

    // Cache for 1 hour
    await this.redisClient.setEx(cacheKey, 3600, JSON.stringify(response));

    return response;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private async getTrafficMultiplier(
    timeOfDay: string,
    dayOfWeek: string,
    lat: number,
    lng: number
  ): Promise<number> {
    // Simplified traffic model - in production, this would use real traffic data
    const baseMultiplier = 1.0;

    // Time-based multipliers
    const timeMultipliers: { [key: string]: number } = {
      morning: 1.3, // 7-10 AM rush hour
      afternoon: 1.1, // 12-3 PM
      evening: 1.4, // 5-8 PM rush hour
      night: 0.9, // 10 PM - 5 AM
    };

    // Day-based multipliers
    const dayMultipliers: { [key: string]: number } = {
      monday: 1.1,
      friday: 1.2,
      saturday: 1.0,
      sunday: 0.8,
    };

    const timeMult = timeMultipliers[timeOfDay] || 1.0;
    const dayMult = dayMultipliers[dayOfWeek] || 1.0;

    return baseMultiplier * timeMult * dayMult;
  }

  private getVehicleSpeed(vehicleType: string): number {
    const speeds: { [key: string]: number } = {
      BIKE: 25, // km/h
      SCOOTER: 30,
      CAR: 35,
      VAN: 28,
    };
    return speeds[vehicleType] || 25;
  }

  private calculateBufferTime(distanceKm: number, timeOfDay: string): number {
    // Base buffer increases with distance
    let buffer = Math.min(distanceKm * 2, 10); // 2 min per km, max 10 min

    // Additional buffer for peak hours
    if (timeOfDay === 'morning' || timeOfDay === 'evening') {
      buffer += 5;
    }

    return buffer;
  }

  private generateCacheKey(request: ETARequest): string {
    return `eta:${request.pickupLat.toFixed(3)}:${request.pickupLng.toFixed(3)}:${request.dropLat.toFixed(3)}:${request.dropLng.toFixed(3)}:${request.vehicleType}:${request.timeOfDay}:${request.dayOfWeek}`;
  }

  /**
   * Get cached ETA for route with default parameters
   */
  async getCachedETA(pickupLat: number, pickupLng: number, dropLat: number, dropLng: number): Promise<number | null> {
    // Use default parameters to generate cache key
    const defaultRequest: ETARequest = {
      pickupLat,
      pickupLng,
      dropLat,
      dropLng,
      prepTimeMinutes: 0,
      vehicleType: 'BIKE',
      timeOfDay: 'morning',
      dayOfWeek: 'monday'
    };

    const cacheKey = this.generateCacheKey(defaultRequest);
    const cached = await this.redisClient.get(cacheKey);

    if (cached) {
      const response: ETAResponse = JSON.parse(cached);
      return response.etaMinutes;
    }

    return null;
  }

  async close(): Promise<void> {
    await this.redisClient.quit();
  }
}
