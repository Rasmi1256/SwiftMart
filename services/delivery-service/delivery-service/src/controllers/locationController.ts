import { Request, Response } from 'express';
import { prisma } from 'database';
import { redisClient } from '../redis';

interface LocationUpdate {
  partnerId: string;
  orderId?: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  timestamp: number;
}

// @desc    Update partner location (HTTP endpoint for mobile app)
// @route   POST /api/delivery/location/update
// @access  Private (Driver Only)
export const updateLocation = async (req: Request, res: Response) => {
  try {
    const { partnerId, orderId, lat, lng, speed, heading, accuracy, timestamp }: LocationUpdate = req.body;
    const driverId = (req as any).user.driverId;

    // Validate that the driver is updating their own location
    if (driverId !== partnerId) {
      return res.status(403).json({ message: 'Unauthorized to update this partner location' });
    }

    // Validate required fields
    if (!lat || !lng || !timestamp) {
      return res.status(400).json({ message: 'Missing required location data' });
    }

    const locationData = {
      partnerId,
      orderId,
      lat,
      lng,
      speed,
      heading,
      accuracy,
      timestamp,
      confidence: 'ACTUAL' as const
    };

    // Store in database (PartnerLocation table)
    const location = await prisma.partnerLocation.create({
      data: {
        partnerId,
        orderId,
        lat,
        lng,
        speed,
        heading,
        accuracy,
        timestamp: new Date(timestamp),
        confidence: 'ACTUAL'
      }
    });

    // Cache in Redis with TTL (5 minutes)
    const cacheKey = `location:${partnerId}`;
    await redisClient.setEx(cacheKey, 300, JSON.stringify(locationData));

    // Also store in location history for analytics
    await prisma.locationHistory.create({
      data: {
        partnerId,
        orderId,
        lat,
        lng,
        speed,
        heading,
        accuracy,
        timestamp: new Date(timestamp),
        confidence: 'ACTUAL'
      }
    });

    res.status(200).json({
      message: 'Location updated successfully',
      location: locationData
    });

  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ message: 'Server error updating location' });
  }
};

// @desc    Get current location of a partner
// @route   GET /api/delivery/location/:partnerId
// @access  Public (for customer app, admin dashboard)
export const getPartnerLocation = async (req: Request, res: Response) => {
  try {
    const { partnerId } = req.params;

    // Try to get from Redis cache first
    const cacheKey = `location:${partnerId}`;
    const cachedLocation = await redisClient.get(cacheKey);

    if (cachedLocation) {
      return res.status(200).json(JSON.parse(cachedLocation));
    }

    // Fallback to database
    const location = await prisma.partnerLocation.findFirst({
      where: { partnerId },
      orderBy: { timestamp: 'desc' }
    });

    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    const locationData = {
      partnerId: location.partnerId,
      orderId: location.orderId,
      lat: location.lat,
      lng: location.lng,
      speed: location.speed,
      heading: location.heading,
      accuracy: location.accuracy,
      timestamp: location.timestamp.getTime(),
      confidence: location.confidence
    };

    res.status(200).json(locationData);

  } catch (error) {
    console.error('Error fetching partner location:', error);
    res.status(500).json({ message: 'Server error fetching location' });
  }
};

// @desc    Get location history for a partner
// @route   GET /api/delivery/location/:partnerId/history
// @access  Private (Admin or Driver)
export const getLocationHistory = async (req: Request, res: Response) => {
  try {
    const { partnerId } = req.params;
    const { startTime, endTime, limit = 100 } = req.query;

    const whereClause: any = { partnerId };

    if (startTime) {
      whereClause.timestamp = { gte: new Date(parseInt(startTime as string)) };
    }

    if (endTime) {
      whereClause.timestamp = { ...whereClause.timestamp, lte: new Date(parseInt(endTime as string)) };
    }

    const history = await prisma.locationHistory.findMany({
      where: whereClause,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string)
    });

    const formattedHistory = history.map(entry => ({
      partnerId: entry.partnerId,
      orderId: entry.orderId,
      lat: entry.lat,
      lng: entry.lng,
      speed: entry.speed,
      heading: entry.heading,
      accuracy: entry.accuracy,
      timestamp: entry.timestamp.getTime(),
      confidence: entry.confidence
    }));

    res.status(200).json({
      partnerId,
      history: formattedHistory,
      count: formattedHistory.length
    });

  } catch (error) {
    console.error('Error fetching location history:', error);
    res.status(500).json({ message: 'Server error fetching location history' });
  }
};

// @desc    Get locations for multiple partners (for admin dashboard)
// @route   GET /api/delivery/location/partners
// @access  Private (Admin Only)
export const getMultiplePartnerLocations = async (req: Request, res: Response) => {
  try {
    const { partnerIds } = req.query;

    if (!partnerIds || typeof partnerIds !== 'string') {
      return res.status(400).json({ message: 'partnerIds query parameter required' });
    }

    const ids = partnerIds.split(',');

    // Get from cache first
    const locations = [];
    for (const partnerId of ids) {
      const cacheKey = `location:${partnerId}`;
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        locations.push(JSON.parse(cached));
      } else {
        // Fallback to database
        const dbLocation = await prisma.partnerLocation.findFirst({
          where: { partnerId },
          orderBy: { timestamp: 'desc' }
        });
        if (dbLocation) {
          locations.push({
            partnerId: dbLocation.partnerId,
            orderId: dbLocation.orderId,
            lat: dbLocation.lat,
            lng: dbLocation.lng,
            speed: dbLocation.speed,
            heading: dbLocation.heading,
            accuracy: dbLocation.accuracy,
            timestamp: dbLocation.timestamp.getTime(),
            confidence: dbLocation.confidence
          });
        }
      }
    }

    res.status(200).json({ locations });

  } catch (error) {
    console.error('Error fetching multiple partner locations:', error);
    res.status(500).json({ message: 'Server error fetching locations' });
  }
};
