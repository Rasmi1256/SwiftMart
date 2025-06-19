import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Secret } from 'jsonwebtoken';
import axios from 'axios'; // To communicate with Order Management Service
import { config } from '../config';
import DeliveryPerson from '../models/deliveryPerson';

// Helper function to generate JWT for delivery person

const generateToken = (id: string, email: string): string => {
  return jwt.sign(
    { id, email },
    config.jwtSecret as Secret,
    { expiresIn: String(config.jwtExpiresIn) }
  );
};


// @desc    Register a new delivery person
// @route   POST /api/delivery/register
// @access  Public (should be Admin protected in real app, but public for MVP testing)
export const registerDeliveryPerson = async (req: Request, res: Response): Promise<void> => {
  const { email, password, firstName, lastName, phoneNumber, vehicleType, licensePlate } = req.body;

  if (!email || !password || !firstName || !lastName || !phoneNumber || !vehicleType) {
    res.status(400).json({ message: 'Please provide all required fields.' });
    return;
  }

  try {
    const deliveryPersonExists = await DeliveryPerson.findOne({ $or: [{ email }, { phoneNumber }] });
    if (deliveryPersonExists) {
      res.status(400).json({ message: 'Delivery person with this email or phone number already exists.' });
      return;
    }

    const newDeliveryPerson = new DeliveryPerson({
      email,
      passwordHash: password, // Mongoose pre-save hook will hash this
      firstName,
      lastName,
      phoneNumber,
      vehicleType,
      licensePlate,
      status: 'inactive', // Default to inactive, activated by admin later
    });

    // Explicitly type the saved document to avoid 'unknown' type for _id
    const deliveryPerson = await newDeliveryPerson.save() as (typeof newDeliveryPerson & { _id: string; email: string; firstName: string; phoneNumber: string; status: string; });

    // In a real app, only an admin would typically register riders.
    // We won't generate a token on registration here, as they'd be activated by admin first.
    // For MVP, we will generate a token so they can immediately login.
    const token = generateToken(deliveryPerson._id.toString(), deliveryPerson.email);

    res.status(201).json({
      message: 'Delivery person registered successfully. Awaiting admin activation.',
      deliveryPerson: {
        id: (deliveryPerson._id as string).toString(),
        email: deliveryPerson.email,
        firstName: deliveryPerson.firstName,
        phoneNumber: deliveryPerson.phoneNumber,
        status: deliveryPerson.status,
      },
      token // For MVP, allow immediate login
    });
  } catch (error) {
    console.error('Error registering delivery person:', error);
    res.status(500).json({ message: 'Server error during registration.' });
  }
};

// @desc    Authenticate delivery person & get token
// @route   POST /api/delivery/login
// @access  Public
export const loginDeliveryPerson = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: 'Please provide email and password.' });
    return;
  }

  try {
    const deliveryPerson = await DeliveryPerson.findOne({ email }) as (typeof DeliveryPerson.prototype & { _id: string; email: string; firstName: string; lastName: string; phoneNumber: string; vehicleType: string; status: string; comparePassword: (password: string) => Promise<boolean>; });
    if (!deliveryPerson) {
      res.status(400).json({ message: 'Invalid credentials.' });
      return;
    }

    if (deliveryPerson.status === 'inactive') {
      res.status(403).json({ message: 'Your account is inactive. Please contact admin.' });
      return;
    }

    const isMatch = await deliveryPerson.comparePassword(password);
    if (!isMatch) {
      res.status(400).json({ message: 'Invalid credentials.' });
      return;
    }

    const token = generateToken(deliveryPerson._id.toString(), deliveryPerson.email);

    res.status(200).json({
      message: 'Logged in successfully',
      deliveryPerson: {
        id: deliveryPerson._id.toString(),
        email: deliveryPerson.email,
        firstName: deliveryPerson.firstName,
        lastName: deliveryPerson.lastName,
        phoneNumber: deliveryPerson.phoneNumber,
        vehicleType: deliveryPerson.vehicleType,
        status: deliveryPerson.status,
      },
      token,
    });
  } catch (error) {
    console.error('Error logging in delivery person:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

// @desc    Get delivery person profile
// @route   GET /api/delivery/profile
// @access  Private (Delivery Person Only)
export const getDeliveryPersonProfile = async (req: Request, res: Response): Promise<void> => {
  if (!req.deliveryPerson) {
    res.status(401).json({ message: 'Not authorized, delivery person not found.' });
    return;
  }

  try {
    const deliveryPerson = await DeliveryPerson.findById(req.deliveryPerson.id).select('-passwordHash') as (typeof DeliveryPerson.prototype & { _id: string; email: string; firstName: string; lastName: string; phoneNumber: string; vehicleType: string; licensePlate: string; status: string; currentLocation?: any; assignedOrders: string[]; });
    if (!deliveryPerson) {
      res.status(404).json({ message: 'Delivery person profile not found.' });
      return;
    }

    res.status(200).json({
      id: deliveryPerson._id.toString(),
      email: deliveryPerson.email,
      firstName: deliveryPerson.firstName,
      lastName: deliveryPerson.lastName,
      phoneNumber: deliveryPerson.phoneNumber,
      vehicleType: deliveryPerson.vehicleType,
      licensePlate: deliveryPerson.licensePlate,
      status: deliveryPerson.status,
      currentLocation: deliveryPerson.currentLocation,
      assignedOrders: deliveryPerson.assignedOrders,
    });
  } catch (error) {
    console.error('Error fetching delivery person profile:', error);
    res.status(500).json({ message: 'Server error fetching profile.' });
  }
};

// @desc    Get assigned orders for a delivery person
// @route   GET /api/delivery/orders
// @access  Private (Delivery Person Only)
export const getAssignedOrders = async (req: Request, res: Response): Promise<void> => {
  if (!req.deliveryPerson) {
    res.status(401).json({ message: 'Not authorized, delivery person not found.' });
    return;
  }

  try {
    const deliveryPerson = await DeliveryPerson.findById(req.deliveryPerson.id);
    if (!deliveryPerson) {
      res.status(404).json({ message: 'Delivery person not found.' });
      return;
    }

    const assignedOrderIds = deliveryPerson.assignedOrders;

    // Fetch order details from Order Management Service
    const ordersDetails = await Promise.all(assignedOrderIds.map(async (orderId) => {
      try {
        const response = await axios.get(`${config.orderManagementServiceUrl}/orders/${orderId}`, {
          headers: { Authorization: req.headers.authorization } // Forward JWT token for authorization
        });
        return (response.data as { order: any }).order;
      } catch (err: any) {
        console.warn(`Could not fetch order ${orderId}:`, err.response?.data || err.message);
        return null; // Return null if order cannot be fetched
      }
    }));

    // Filter out any nulls if orders couldn't be fetched
    const validOrders = ordersDetails.filter(Boolean);

    res.status(200).json({
      message: 'Assigned orders fetched successfully',
      orders: validOrders,
    });
  } catch (error) {
    console.error('Error fetching assigned orders:', error);
    res.status(500).json({ message: 'Server error fetching assigned orders.' });
  }
};

// @desc    Update delivery order status (e.g., picked up, delivered)
// @route   PUT /api/delivery/orders/:orderId/status
// @access  Private (Delivery Person Only)
export const updateDeliveryOrderStatus = async (req: Request, res: Response): Promise<void> => {
  if (!req.deliveryPerson) {
    res.status(401).json({ message: 'Not authorized, delivery person not found.' });
    return;
  }

  const { orderId } = req.params;
  const { status } = req.body; // Expected status: 'picked', 'delivered', 'failed' (or corresponding OrderService statuses)

  if (!status) {
    res.status(400).json({ message: 'New status is required.' });
    return;
  }

  try {
    // 1. Verify if the order is actually assigned to this delivery person
    const deliveryPerson = await DeliveryPerson.findById(req.deliveryPerson.id);
    if (!deliveryPerson || !deliveryPerson.assignedOrders.includes(orderId)) {
        res.status(403).json({ message: 'Order not assigned to this delivery person.' });
        return;
    }

    // Map delivery person status to order service status
    let newOrderStatus: string;
    switch (status) {
      case 'picked':
        newOrderStatus = 'shipped'; // Corresponds to 'shipped' in OrderService
        break;
      case 'delivered':
        newOrderStatus = 'delivered';
        break;
      case 'failed':
        newOrderStatus = 'cancelled'; // Or a more specific 'failed_delivery' status if it exists
        break;
      default:
        res.status(400).json({ message: 'Invalid delivery status provided.' });
        return;
    }

    // 2. Call Order Management Service to update order status
    const updateResponse = await axios.put(
      `${config.orderManagementServiceUrl}/admin/orders/${orderId}`, // Use admin endpoint for status update
      { status: newOrderStatus },
      {
        headers: {
          Authorization: req.headers.authorization, // Forward delivery person's JWT
        },
      }
    );

    if (updateResponse.status !== 200) {
        res.status(500).json({ message: 'Failed to update order status in Order Management Service.' });
        return;
    }

    // 3. Update delivery person's assigned orders if delivered/failed
    if (status === 'delivered' || status === 'failed') {
      await DeliveryPerson.findByIdAndUpdate(
        req.deliveryPerson.id,
        { $pull: { assignedOrders: orderId } } // Remove order from assigned list
      );
    }

    res.status(200).json({
      message: `Order ${orderId} status updated to ${newOrderStatus} successfully.`,
      order: (updateResponse.data as { order: any }).order,
    });
  } catch (error) {
    console.error('Error updating delivery order status:', (error as any).response?.data || error);
    res.status(500).json({ message: 'Server error updating delivery status.' });
  }
};

// @desc    Assign an order to a delivery person (for Admin Panel to use)
// @route   POST /api/delivery/assign-order
// @access  Private (Admin Only - typically backend-to-backend or Admin UI)
export const assignOrderToDeliveryPerson = async (req: Request, res: Response): Promise<void> => {
  if (!req.deliveryPerson) { // We'll re-use protectDeliveryPerson, but this route should be admin-protected
    res.status(401).json({ message: 'Not authorized.' });
    return;
  }

  const { deliveryPersonId, orderId } = req.body;

  if (!deliveryPersonId || !orderId) {
    res.status(400).json({ message: 'Delivery Person ID and Order ID are required.' });
    return;
  }

  try {
    const deliveryPerson = await DeliveryPerson.findById(deliveryPersonId);
    if (!deliveryPerson) {
      res.status(404).json({ message: 'Delivery person not found.' });
      return;
    }

    // Prevent assigning if already assigned
    if (deliveryPerson.assignedOrders.includes(orderId)) {
      res.status(400).json({ message: 'Order is already assigned to this delivery person.' });
      return;
    }

    deliveryPerson.assignedOrders.push(orderId);
    await deliveryPerson.save();

    // Optionally update order status in Order Management Service to 'processing' here
    // For MVP, we'll assume it's done when an order is picked up by rider.

    res.status(200).json({
      message: `Order ${orderId} assigned to ${deliveryPerson.firstName} successfully.`,
      deliveryPerson: {
        id: deliveryPerson._id,
        firstName: deliveryPerson.firstName,
        assignedOrders: deliveryPerson.assignedOrders,
      },
    });
  } catch (error) {
    console.error('Error assigning order:', error);
    res.status(500).json({ message: 'Server error assigning order.' });
  }
};
