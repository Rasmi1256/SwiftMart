import { ETARequest, ETAResponse } from './types';
import { DistanceService } from '../distance/DistanceService';
import { TrafficService } from '../traffic/TrafficService';
import { VehicleProfileService } from '../vehicle/VehicleProfileService';
import { BufferPolicyService } from '../buffer/BufferPolicyService';
import { CacheService } from '../cache/CacheService';

// Utility functions for bucketing
function geoBucket(lat: number, lng: number): { lat: number; lng: number } {
  // Round to ~100m precision (0.001 degrees ≈ 100m at equator)
  return {
    lat: Math.round(lat * 1000) / 1000,
    lng: Math.round(lng * 1000) / 1000
  };
}

function timeBucket(timeOfDay: string): string {
  // timeOfDay is already bucketed, but keeping for consistency
  return timeOfDay;
}

export class ETAOrchestrator {
  constructor(
    private distanceService: DistanceService,
    private trafficService: TrafficService,
    private vehicleService: VehicleProfileService,
    private bufferService: BufferPolicyService,
    private cacheService: CacheService
  ) {}

  async predict(request: ETARequest): Promise<ETAResponse> {
    // Use bucketed coordinates for cache key to reduce key space
    const pickupBucket = geoBucket(request.pickupLat, request.pickupLng);
    const dropBucket = geoBucket(request.dropLat, request.dropLng);
    const timeBucketed = timeBucket(request.timeOfDay);

    const cacheKey = `eta:v2:${pickupBucket.lat}:${pickupBucket.lng}:${dropBucket.lat}:${dropBucket.lng}:${request.vehicleType}:${timeBucketed}:${request.dayOfWeek}`;

    // Check cache first
    const cached = await this.cacheService.get<ETAResponse>(cacheKey);
    if (cached) return cached;

    // Cache miss - try to acquire lock to prevent stampede
    const lockKey = `lock:${cacheKey}`;
    const lockAcquired = await this.cacheService.acquireLock(lockKey, 30);

    if (!lockAcquired) {
      // Another process is computing this ETA, wait a bit and try cache again
      await new Promise(resolve => setTimeout(resolve, 100));
      const cachedAfterWait = await this.cacheService.get<ETAResponse>(cacheKey);
      if (cachedAfterWait) {
        return cachedAfterWait;
      }
      // Still no cache, proceed to compute (lock might have expired)
    }

    try {
      // Compute ETA
      const response = await this.computeETA(request);

      // Cache the result
      await this.cacheService.set(cacheKey, response, 3600);

      return response;
    } finally {
      // Always release the lock
      if (lockAcquired) {
        await this.cacheService.releaseLock(lockKey);
      }
    }
  }

  private async computeETA(request: ETARequest): Promise<ETAResponse> {
    const distanceKm = this.distanceService.calculateKm(
      request.pickupLat,
      request.pickupLng,
      request.dropLat,
      request.dropLng
    );

    const speed = this.vehicleService.getAverageSpeed(request.vehicleType);
    const trafficMultiplier = await this.trafficService.getMultiplier(
      request.timeOfDay,
      request.dayOfWeek
    );

    const travelTime = (distanceKm / speed) * 60 * trafficMultiplier;
    const buffer = this.bufferService.calculate(distanceKm, request.timeOfDay);

    const etaMinutes = Math.ceil(
      travelTime + buffer + request.prepTimeMinutes
    );

    return {
      etaMinutes,
      breakdown: {
        distanceKm: Math.round(distanceKm * 100) / 100,
        travelTimeMinutes: Math.ceil(travelTime),
        bufferTimeMinutes: Math.ceil(buffer),
        prepTimeMinutes: request.prepTimeMinutes
      }
    };
  }

  async getCachedETA(pickupLat: number, pickupLng: number, dropLat: number, dropLng: number): Promise<number | null> {
    // Use bucketed coordinates for cache key consistency
    const pickupBucket = geoBucket(pickupLat, pickupLng);
    const dropBucket = geoBucket(dropLat, dropLng);
    const cacheKey = `eta:v2:${pickupBucket.lat}:${pickupBucket.lng}:${dropBucket.lat}:${dropBucket.lng}:BIKE:morning:monday`;
    const cached = await this.cacheService.get<ETAResponse>(cacheKey);
    return cached ? cached.etaMinutes : null;
  }
}
