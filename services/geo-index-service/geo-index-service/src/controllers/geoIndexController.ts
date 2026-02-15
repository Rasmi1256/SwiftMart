import { Request, Response } from 'express';
import { GeoIndexService, DriverStatus } from '../services/geoIndexService';
import { RedisClientFactory } from '../infra/redisClient';

// Create service instance with Redis client
const redisClient = RedisClientFactory.getInstance();
if (!redisClient) {
  throw new Error('Redis client not initialized');
}
const geoIndexService = new GeoIndexService(redisClient);

// @desc    Index driver location using H3 and Redis
// @route   POST /api/geo/drivers/:driverId/location
// @access  Internal
export const indexDriverLocation = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;
    const { lat, lng, status } = req.body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ message: 'Valid latitude and longitude are required.' });
    }

    await geoIndexService.indexDriverLocation(driverId, lat, lng);

    res.status(200).json({
      message: 'Driver location indexed successfully.',
      driverId,
      location: { lat, lng }
    });
  } catch (error) {
    console.error('Error indexing driver location:', error);
    res.status(500).json({ message: 'Failed to index driver location.' });
  }
};

// @desc    Remove driver location from index
// @route   DELETE /api/geo/drivers/:driverId/location
// @access  Internal
export const removeDriverLocation = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;

    await geoIndexService.removeDriverLocation(driverId);

    res.status(200).json({
      message: 'Driver location removed from index.',
      driverId
    });
  } catch (error) {
    console.error('Error removing driver location:', error);
    res.status(500).json({ message: 'Failed to remove driver location.' });
  }
};

// @desc    Find nearby drivers within radius
// @route   GET /api/geo/drivers/nearby
// @access  Internal
export const findNearbyDrivers = async (req: Request, res: Response) => {
  try {
    const { lat, lng, radius = 3 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ message: 'Latitude and longitude are required.' });
    }

    const latNum = parseFloat(lat as string);
    const lngNum = parseFloat(lng as string);
    const radiusNum = parseFloat(radius as string);

    if (isNaN(latNum) || isNaN(lngNum) || isNaN(radiusNum)) {
      return res.status(400).json({ message: 'Invalid latitude, longitude, or radius.' });
    }

    const driverIds = await geoIndexService.findNearbyDrivers(latNum, lngNum, radiusNum);

    res.status(200).json({
      driverIds,
      count: driverIds.length,
      searchLocation: { lat: latNum, lng: lngNum },
      radius: radiusNum
    });
  } catch (error) {
    console.error('Error finding nearby drivers:', error);
    res.status(500).json({ message: 'Failed to find nearby drivers.' });
  }
};

// @desc    Get driver location
// @route   GET /api/geo/drivers/:driverId/location
// @access  Internal
export const getDriverLocation = async (req: Request, res: Response) => {
  try {
    const { driverId } = req.params;

    const location = await geoIndexService.getDriverLocation(driverId);

    if (!location) {
      return res.status(404).json({ message: 'Driver location not found.' });
    }

    res.status(200).json({
      driverId,
      location
    });
  } catch (error) {
    console.error('Error getting driver location:', error);
    res.status(500).json({ message: 'Failed to get driver location.' });
  }
};
