// backend/logistics-service/src/controllers/logisticsController.ts
import { Request, Response } from 'express';
import axios from 'axios';
import { prisma, Prisma } from 'database';
import { config } from '../config';

// Helper functions for Advanced Assignment Engine
const findNearbyDrivers = async (lat: number, lng: number): Promise<string[]> => {
  try {
    const response = await axios.get(`${config.geoIndexServiceUrl}/drivers/nearby`, {
      params: { lat, lng, radius: 3 }
    });
    return (response.data as any).driverIds || [];
  } catch (error) {
    console.error('Error finding nearby drivers:', error);
    return [];
  }
};

const getSurgeMultiplier = async (lat: number, lng: number): Promise<number> => {
  try {
    const response = await axios.get(`${config.heatmapServiceUrl}/surge`, {
      params: { lat, lng }
    });
    return (response.data as any).multiplier || 1.0;
  } catch (error) {
    console.error('Error getting surge multiplier:', error);
    return 1.0; // Default no surge
  }
};

const getAIScore = async (
  driver: any,
  pickupLocation: any,
  dropLocation: any,
  eta: number,
  capacityScore: number,
  surgeMultiplier: number,
  orderId: string
): Promise<number> => {
  try {
    const response = await axios.post(`${config.aiScoringServiceUrl}/score`, {
      driverId: driver.id,
      orderId,
      pickupLat: pickupLocation.lat,
      pickupLng: pickupLocation.lng,
      dropLat: dropLocation.lat,
      dropLng: dropLocation.lng,
      etaMinutes: eta,
      capacityScore,
      surgeMultiplier,
      vehicleType: driver.vehicleType,
      timeOfDay: new Date().getHours() < 12 ? 'morning' :
                new Date().getHours() < 17 ? 'afternoon' : 'evening',
      dayOfWeek: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()],
      driverRating: 4.5, // Default rating
      acceptanceRate: 0.85,
      completionRate: 0.92,
      batteryLevel: driver.batteryLevel || 80,
      currentLoad: driver.currentLoad
    });
    return (response.data as any).aiScore || 0.5;
  } catch (error) {
    console.error('Error getting AI score:', error);
    // Fallback to simple scoring
    return (1 / eta) * capacityScore * surgeMultiplier;
  }
};

const getEligibleDrivers = async (driverIds: string[]): Promise<any[]> => {
  const drivers = await prisma.driver.findMany({
    where: {
      id: { in: driverIds },
      status: 'AVAILABLE'
    }
  });

  // Filter drivers with available capacity
  return drivers.filter(driver => driver.currentLoad < driver.maxCapacity);
};

const calculateDriverScores = async (
  drivers: any[],
  pickupLocation: any,
  dropLocation: any,
  prepTime: number,
  orderType: string,
  orderId: string
): Promise<any[]> => {
  const scores = [];

  for (const driver of drivers) {
    try {
      // Get ETA from ETA service
      const etaResponse = await axios.post(`${config.etaServiceUrl}/predict`, {
        pickupLat: pickupLocation.lat,
        pickupLng: pickupLocation.lng,
        dropLat: dropLocation.lat,
        dropLng: dropLocation.lng,
        prepTimeMinutes: prepTime,
        vehicleType: driver.vehicleType,
        timeOfDay: new Date().getHours() < 12 ? 'morning' :
                  new Date().getHours() < 17 ? 'afternoon' : 'evening',
        dayOfWeek: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date().getDay()]
      });

      const eta = (etaResponse.data as any).etaMinutes;

      // Calculate capacity score
      const capacityScore = 1 - (driver.currentLoad / driver.maxCapacity);

      // Get surge multiplier from heatmap service
      const surgeMultiplier = await getSurgeMultiplier(pickupLocation.lat, pickupLocation.lng);

      // Get AI score from AI Scoring Service (Phase 3)
      const aiScore = await getAIScore(driver, pickupLocation, dropLocation, eta, capacityScore, surgeMultiplier, orderId);

      // Final score combines ETA, capacity, surge, and AI prediction
      const finalScore = aiScore; // AI model provides the final score

      scores.push({
        driverId: driver.id,
        driverName: driver.name,
        etaMinutes: eta,
        capacityScore,
        surgeMultiplier,
        aiScore,
        totalScore: finalScore
      });
    } catch (error) {
      console.error(`Error calculating score for driver ${driver.id}:`, error);
    }
  }

  return scores.sort((a, b) => b.totalScore - a.totalScore);
};

const selectBestDriver = (driverScores: any[]): any => {
  return driverScores[0] || null;
};

const assignToDriver = async (orderId: string, driverId: string, pickupLocation: any, dropLocation: any) => {
  return await prisma.$transaction(async (tx) => {
    // Create delivery record
    const delivery = await tx.delivery.create({
      data: {
        orderId,
        driverId,
        deliveryAddress: dropLocation,
        status: 'assigned',
      },
    });

    // Update driver status and load
    const updatedDriver = await tx.driver.update({
      where: { id: driverId },
      data: {
        status: 'ON_DELIVERY',
        currentLoad: { increment: 1 },
        lastUpdated: new Date()
      },
    });

    return { delivery, updatedDriver };
  });
};

const notifyDriver = async (driverId: string, orderId: string, etaMinutes: number) => {
  try {
    await axios.post(`${config.notificationServiceUrl}/notify/driver`, {
      driverId,
      orderId,
      etaMinutes,
      message: `New order assigned. ETA: ${etaMinutes} minutes.`
    });
  } catch (error) {
    console.error('Error notifying driver:', error);
    // Don't fail the assignment if notification fails
  }
};

// Helper to update Order Service status
const updateOrderStatus = async (orderId: string, status: string, driverId: string) => {
    // NOTE: This call should include JWT/API key for authentication
    return axios.put(
        `${config.orderServiceUrl}/orders/internal/status/${orderId}`,
        { status, driverId }
    );
};

// @desc    Admin: Create a new driver profile (after user is created in user-service)
// @route   POST /api/logistics/admin/drivers
// @access  Private (Admin Only)
export const createDriver = async (req: Request, res: Response) => {
  try {
    const { userId, name, vehicleType } = req.body;
    const newDriver = await prisma.driver.create({
      data: { userId, name, vehicleType },
    });
    res.status(201).json({ message: 'Driver created successfully.', driver: newDriver });
  } catch (error) {
    console.error('Error creating driver:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return res.status(400).json({ message: 'A driver profile already exists for this user ID.' });
    }
    res.status(500).json({ message: 'Server error creating driver.' });
  }
};

// @desc    Internal: Assign a pending order to an available driver using Advanced Assignment Engine
// @route   POST /api/logistics/internal/assign
// @access  Internal (Order/Fulfillment Service Only)
export const assignOrder = async (req: Request, res: Response) => {
  const { orderId, customerId, pickupLocation, dropLocation, prepTime, priority, orderType } = req.body;

  try {
    // 1. Get order details from database
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    // 2. Find nearby drivers using Geo Index Service
    const nearbyDriverIds = await findNearbyDrivers(pickupLocation.lat, pickupLocation.lng);

    if (nearbyDriverIds.length === 0) {
      return res.status(404).json({ message: 'No drivers available in the area.' });
    }

    // 3. Get driver details and filter eligible drivers
    const eligibleDrivers = await getEligibleDrivers(nearbyDriverIds);

    if (eligibleDrivers.length === 0) {
      return res.status(404).json({ message: 'No eligible drivers available.' });
    }

    // 4. Calculate ETA and scores for each driver
    const driverScores = await calculateDriverScores(
      eligibleDrivers,
      pickupLocation,
      dropLocation,
      prepTime,
      orderType,
      orderId
    );

    // 5. Select the best driver
    const bestDriver = selectBestDriver(driverScores);

    if (!bestDriver) {
      return res.status(404).json({ message: 'No suitable driver found.' });
    }

    // 6. Assign the order to the selected driver
    const result = await assignToDriver(orderId, bestDriver.driverId, pickupLocation, dropLocation);

    // 7. Update Order Status in Order Service
    await updateOrderStatus(orderId, 'assigned', bestDriver.driverId);

    // 8. Notify the driver (placeholder for notification service)
    await notifyDriver(bestDriver.driverId, orderId, bestDriver.etaMinutes);

    res.status(200).json({
      message: `Order ${orderId} assigned to driver ${bestDriver.driverName}.`,
      driverId: bestDriver.driverId,
      driverName: bestDriver.driverName,
      etaMinutes: bestDriver.etaMinutes,
    });
  } catch (error) {
    console.error('Error assigning order:', (error as any).response?.data || error);
    res.status(500).json({ message: 'Failed to assign order.' });
  }
};

// @desc    Driver: Update order status to 'picked_up'
// @route   PUT /api/logistics/driver/pickup
// @access  Private (Driver Only)
export const pickupOrder = async (req: Request, res: Response) => {
  const { orderId } = req.body;
  const driverId = (req as any).user.driverId; // Assumes driverId is attached to the request user object after auth

  try {
    // Find delivery record for this order and driver
    const delivery = await prisma.delivery.findFirst({
      where: {
        orderId,
        driverId,
        status: 'assigned',
      },
    });

    if (!delivery) {
      return res.status(404).json({ message: 'Order not found or not assigned to this driver.' });
    }

    // Update delivery status
    await prisma.delivery.update({
      where: { id: delivery.id },
      data: { status: 'picked_up' },
    });

    // Update Order Status in Order Service
    await updateOrderStatus(orderId, 'picked_up', driverId);

    res.status(200).json({ message: `Order ${orderId} status updated to picked_up.` });
  } catch (error) {
    console.error('Error during pickup:', error);
    res.status(500).json({ message: 'Failed to update order status to picked up.' });
  }
};

// @desc    Driver: Update order status to 'delivered'
// @route   PUT /api/logistics/driver/deliver
// @access  Private (Driver Only)
export const deliverOrder = async (req: Request, res: Response) => {
  const { orderId } = req.body;
  const driverId = (req as any).user.driverId;

  try {
    // Find delivery record for this order and driver
    const delivery = await prisma.delivery.findFirst({
      where: {
        orderId,
        driverId,
        status: 'picked_up',
      },
    });

    if (!delivery) {
      return res.status(404).json({ message: 'Order not found or not picked up by this driver.' });
    }

    // Update delivery status and set actual delivery time
    await prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        status: 'delivered',
        actualDeliveryTime: new Date(),
      },
    });

    // Check if driver has any more active deliveries
    const activeDeliveries = await prisma.delivery.count({
      where: {
        driverId,
        status: { in: ['assigned', 'picked_up'] },
      },
    });

    // If no more active deliveries, set driver status back to 'available'
    if (activeDeliveries === 0) {
      await prisma.driver.update({
        where: { id: driverId },
        data: { status: 'available' },
      });
    }

    // Update Order Status in Order Service
    await updateOrderStatus(orderId, 'delivered', driverId);

    res.status(200).json({ message: `Order ${orderId} successfully delivered.` });
  } catch (error) {
    console.error('Error during delivery:', error);
    res.status(500).json({ message: 'Failed to update order status to delivered.' });
  }
};

// @desc    Driver: Update current location
// @route   PUT /api/logistics/driver/location
// @access  Private (Driver Only)
export const updateDriverLocation = async (req: Request, res: Response) => {
    const { lat, lng } = req.body;
    const driverId = (req as any).user.driverId;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
        return res.status(400).json({ message: 'Valid latitude and longitude are required.' });
    }

    try {
        const driver = await prisma.driver.update({
            where: { id: driverId },
            data: { currentLocation: { lat, lng } },
        });

        if (!driver) {
            return res.status(404).json({ message: 'Driver not found.' });
        }

        res.status(200).json({
            message: 'Location updated.',
            location: driver.currentLocation
        });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return res.status(404).json({ message: 'Driver not found.' });
        }
        console.error('Error updating driver location:', error);
        res.status(500).json({ message: 'Failed to update location.' });
    }
};

// @desc    Route Optimization: Assign orders to routes
// @route   POST /api/logistics/routes/assign
// @access  Internal (Route Optimization Service)
export const assignOrdersToRoutes = async (req: Request, res: Response) => {
  const { routeId, orderIds, driverId, vehicleId } = req.body;

  try {
    // Create route record
    const route = await prisma.route.create({
      data: {
        driverId,
        vehicleId,
        status: 'PLANNED',
        totalDistance: 0,
        totalTime: 0,
      },
    });

    // Create stop records for each order
    const stops = [];
    for (let i = 0; i < orderIds.length; i++) {
      const order = await prisma.order.findUnique({
        where: { id: orderIds[i] },
        include: { shippingAddress: true }
      });

      if (!order) continue;

      const stop = await prisma.stop.create({
        data: {
          routeId: route.id,
          orderId: orderIds[i],
          sequence: i + 1,
          latitude: order.shippingAddress?.latitude || 0,
          longitude: order.shippingAddress?.longitude || 0,
          serviceTime: 5, // Default 5 minutes service time
        },
      });
      stops.push(stop);
    }

    // Update route with calculated totals (placeholder for now)
    await prisma.route.update({
      where: { id: route.id },
      data: {
        totalDistance: 10.5, // Placeholder - would be calculated by route optimization service
        totalTime: 45, // Placeholder - would be calculated by route optimization service
      },
    });

    res.status(201).json({
      message: 'Orders assigned to route successfully.',
      route: {
        id: route.id,
        driverId,
        vehicleId,
        stops: stops.length,
        totalDistance: 10.5,
        totalTime: 45,
      },
    });
  } catch (error) {
    console.error('Error assigning orders to route:', error);
    res.status(500).json({ message: 'Failed to assign orders to route.' });
  }
};

// @desc    Route Optimization: Get route details
// @route   GET /api/logistics/routes/:routeId
// @access  Internal (Route Optimization Service)
export const getRouteDetails = async (req: Request, res: Response) => {
  const { routeId } = req.params;

  try {
    const route = await prisma.route.findUnique({
      where: { id: routeId },
      include: {
        driver: true,
        vehicle: true,
        stops: {
          include: {
            order: {
              include: {
                shippingAddress: true,
                items: true,
              },
            },
          },
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!route) {
      return res.status(404).json({ message: 'Route not found.' });
    }

    res.status(200).json({ route });
  } catch (error) {
    console.error('Error getting route details:', error);
    res.status(500).json({ message: 'Failed to get route details.' });
  }
};

// @desc    Route Optimization: Update route status
// @route   PUT /api/logistics/routes/:routeId/status
// @access  Internal (Route Optimization Service)
export const updateRouteStatus = async (req: Request, res: Response) => {
  const { routeId } = req.params;
  const { status } = req.body;

  try {
    const route = await prisma.route.update({
      where: { id: routeId },
      data: { status },
    });

    res.status(200).json({
      message: 'Route status updated successfully.',
      route,
    });
  } catch (error) {
    console.error('Error updating route status:', error);
    res.status(500).json({ message: 'Failed to update route status.' });
  }
};
