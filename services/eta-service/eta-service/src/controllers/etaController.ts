import { Request, Response } from 'express';
import { ETAOrchestrator } from '../services/eta/ETAOrchestrator';
import { DistanceService } from '../services/distance/DistanceService';
import { TrafficService } from '../services/traffic/TrafficService';
import { VehicleProfileService } from '../services/vehicle/VehicleProfileService';
import { BufferPolicyService } from '../services/buffer/BufferPolicyService';
import { CacheService } from '../services/cache/CacheService';
import { initRedis } from '../infra/redisClient';
import { ETARequest } from '../services/eta/types';

let etaOrchestrator: ETAOrchestrator | null = null;

/**
 * Initializes the ETAOrchestrator singleton instance.
 * In a real-world scenario, this would be part of the application's startup process.
 */
async function getOrchestrator(): Promise<ETAOrchestrator> {
  if (etaOrchestrator) {
    return etaOrchestrator;
  }

  // This initialization should ideally happen once when the service starts.
  // For simplicity here, we'll use a lazy-loaded singleton pattern.
  const redisClient = await initRedis();
  const cacheService = new CacheService(redisClient);
  const distanceService = new DistanceService();
  const trafficService = new TrafficService();
  const vehicleService = new VehicleProfileService();
  // NOTE: BufferPolicyService is not provided in the context but is a dependency.
  // Assuming it has a default constructor.
  const bufferService = new BufferPolicyService();

  etaOrchestrator = new ETAOrchestrator(
    distanceService,
    trafficService,
    vehicleService,
    bufferService,
    cacheService
  );

  return etaOrchestrator;
}

export const getCachedETA = async (req: Request, res: Response): Promise<Response> => {
  try {
    const {
      pickupLat, pickupLng, dropLat, dropLng,
      prepTimeMinutes, vehicleType, timeOfDay, dayOfWeek
    } = req.query;

    if (!pickupLat || !pickupLng || !dropLat || !dropLng || !vehicleType || !timeOfDay || !dayOfWeek) {
      return res.status(400).json({ message: 'Missing required query parameters.' });
    }

    const etaRequest: ETARequest = {
      pickupLat: parseFloat(pickupLat as string),
      pickupLng: parseFloat(pickupLng as string),
      dropLat: parseFloat(dropLat as string),
      dropLng: parseFloat(dropLng as string),
      prepTimeMinutes: prepTimeMinutes ? parseInt(prepTimeMinutes as string, 10) : 0,
      vehicleType: vehicleType as string,
      timeOfDay: timeOfDay as string,
      dayOfWeek: dayOfWeek as string,
    };

    const orchestrator = await getOrchestrator();
    const etaResponse = await orchestrator.predict(etaRequest);

    return res.status(200).json(etaResponse);
  } catch (error) {
    console.error('[ETAController] Failed to predict ETA:', error);
    return res.status(500).json({ message: 'Internal server error while predicting ETA.' });
  }
};