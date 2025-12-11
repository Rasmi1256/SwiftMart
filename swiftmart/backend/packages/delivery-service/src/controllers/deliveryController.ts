import { Request, Response } from 'express';
import prisma from '../db';

// @desc    Create a new delivery
// @route   POST /api/delivery/admin/deliveries
// @access  Private (Admin Only)
export const createDelivery = async (req: Request, res: Response) => {
  try {
    const { orderId, driverId, deliveryAddress, estimatedDeliveryTime, notes } = req.body;

    const delivery = await prisma.delivery.create({
      data: {
        orderId,
        driverId,
        deliveryAddress,
        estimatedDeliveryTime: estimatedDeliveryTime ? new Date(estimatedDeliveryTime) : undefined,
        notes,
      },
    });

    res.status(201).json({ message: 'Delivery created successfully.', delivery });
  } catch (error) {
    console.error('Error creating delivery:', error);
    res.status(500).json({ message: 'Server error creating delivery.' });
  }
};

// @desc    Get delivery by ID
// @route   GET /api/delivery/deliveries/:id
// @access  Public
export const getDelivery = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const delivery = await prisma.delivery.findUnique({
      where: { id },
      include: { driver: true },
    });
    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found.' });
    }

    res.status(200).json(delivery);
  } catch (error) {
    console.error('Error fetching delivery:', error);
    res.status(500).json({ message: 'Server error fetching delivery.' });
  }
};

// @desc    Get all deliveries
// @route   GET /api/delivery/deliveries
// @access  Public
export const getDeliveries = async (req: Request, res: Response) => {
  try {
    const deliveries = await prisma.delivery.findMany({
      include: { driver: true },
    });

    res.status(200).json(deliveries);
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ message: 'Server error fetching deliveries.' });
  }
};

// @desc    Update delivery status
// @route   PUT /api/delivery/driver/deliveries/:id/status
// @access  Private (Driver Only)
export const updateDeliveryStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, actualDeliveryTime } = req.body;
    const driverId = (req as any).user.driverId;

    const delivery = await prisma.delivery.findUnique({ where: { id } });

    if (!delivery || delivery.driverId !== driverId) {
      return res.status(404).json({ message: 'Delivery not found or not assigned to this driver.' });
    }

    const updateData: any = { status };
    if (status === 'delivered' && actualDeliveryTime) {
      updateData.actualDeliveryTime = new Date(actualDeliveryTime);
    }

    const updatedDelivery = await prisma.delivery.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({ message: 'Delivery status updated.', delivery: updatedDelivery });
  } catch (error) {
    console.error('Error updating delivery status:', error);
    res.status(500).json({ message: 'Server error updating delivery status.' });
  }
};

// @desc    Assign driver to delivery
// @route   POST /api/delivery/internal/assign
// @access  Internal
export const assignDriver = async (req: Request, res: Response) => {
  try {
    const { orderId, driverId } = req.body;

    const delivery = await prisma.delivery.findUnique({ where: { orderId } });

    if (!delivery) {
      return res.status(404).json({ message: 'Delivery not found.' });
    }

    const updatedDelivery = await prisma.delivery.update({
      where: { id: delivery.id },
      data: { driverId, status: 'assigned' },
    });

    res.status(200).json({ message: 'Driver assigned to delivery.', delivery: updatedDelivery });
  } catch (error) {
    console.error('Error assigning driver:', error);
    res.status(500).json({ message: 'Server error assigning driver.' });
  }
};
