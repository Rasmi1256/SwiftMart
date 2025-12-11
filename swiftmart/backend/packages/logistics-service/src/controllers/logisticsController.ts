// backend/logistics-service/src/controllers/logisticsController.ts
import { Request, Response } from 'express';
import axios from 'axios';
import prisma from '../db';
import { Prisma } from '../generated/prisma/client';
import { config } from '../config';

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

// @desc    Internal: Assign a pending order to an available driver
// @route   POST /api/logistics/internal/assign
// @access  Internal (Order/Fulfillment Service Only)
export const assignOrder = async (req: Request, res: Response) => {
  const { orderId, customerId, deliveryLocation } = req.body;

  try {
    // 1. Find the best available driver (simplistic: find first 'available' driver)
    const driver = await prisma.driver.findFirst({ where: { status: 'available' } });

    if (!driver) {
      return res.status(404).json({ message: 'No available drivers at this time.' });
    }
    
    // 2. Assign the order and update driver status atomically
    const updatedDriver = await prisma.driver.update({
      where: { id: driver.id },
      data: {
        assignedOrders: { push: { orderId, customerId, deliveryLocation } },
        status: 'on_delivery',
      },
    });
    
    // 3. Update Order Status in Order Service
    await updateOrderStatus(orderId, 'assigned', updatedDriver.id);

    res.status(200).json({
      message: `Order ${orderId} assigned to driver ${updatedDriver.name}.`,
      driverId: updatedDriver.id,
      driverName: updatedDriver.name,
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
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    const assignedOrders = driver?.assignedOrders as { orderId: string }[] | undefined;

    if (!driver || !assignedOrders?.some(order => order.orderId === orderId)) {
        return res.status(404).json({ message: 'Order not found or not assigned to this driver.' });
    }
    
    // Update Order Status in Order Service
    await updateOrderStatus(orderId, 'picked_up', driver.id);

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
    const driver = await prisma.driver.findUnique({ where: { id: driverId } });
    if (!driver) { return res.status(404).json({ message: 'Driver not found.' }); }

    // Remove order from assigned list
    const currentOrders = driver.assignedOrders as any[];
    const updatedOrders = currentOrders.filter(order => order.orderId !== orderId);
    
    // If no more deliveries, set status back to 'available'
    const newStatus = updatedOrders.length === 0 ? 'available' : driver.status;
    await prisma.driver.update({
      where: { id: driverId },
      data: { assignedOrders: updatedOrders, status: newStatus },
    });
    
    // Update Order Status in Order Service
    await updateOrderStatus(orderId, 'delivered', driver.id);

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