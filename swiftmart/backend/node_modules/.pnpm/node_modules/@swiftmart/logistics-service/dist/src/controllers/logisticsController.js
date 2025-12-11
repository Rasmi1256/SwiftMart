"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDriverLocation = exports.deliverOrder = exports.pickupOrder = exports.assignOrder = exports.createDriver = void 0;
const axios_1 = __importDefault(require("axios"));
const db_1 = __importDefault(require("../db"));
const client_1 = require("../generated/prisma/client");
const config_1 = require("../config");
// Helper to update Order Service status
const updateOrderStatus = async (orderId, status, driverId) => {
    // NOTE: This call should include JWT/API key for authentication
    return axios_1.default.put(`${config_1.config.orderServiceUrl}/orders/internal/status/${orderId}`, { status, driverId });
};
// @desc    Admin: Create a new driver profile (after user is created in user-service)
// @route   POST /api/logistics/admin/drivers
// @access  Private (Admin Only)
const createDriver = async (req, res) => {
    try {
        const { userId, name, vehicleType } = req.body;
        const newDriver = await db_1.default.driver.create({
            data: { userId, name, vehicleType },
        });
        res.status(201).json({ message: 'Driver created successfully.', driver: newDriver });
    }
    catch (error) {
        console.error('Error creating driver:', error);
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return res.status(400).json({ message: 'A driver profile already exists for this user ID.' });
        }
        res.status(500).json({ message: 'Server error creating driver.' });
    }
};
exports.createDriver = createDriver;
// @desc    Internal: Assign a pending order to an available driver
// @route   POST /api/logistics/internal/assign
// @access  Internal (Order/Fulfillment Service Only)
const assignOrder = async (req, res) => {
    var _a;
    const { orderId, customerId, deliveryLocation } = req.body;
    try {
        // 1. Find the best available driver (simplistic: find first 'available' driver)
        const driver = await db_1.default.driver.findFirst({ where: { status: 'available' } });
        if (!driver) {
            return res.status(404).json({ message: 'No available drivers at this time.' });
        }
        // 2. Assign the order and update driver status atomically
        const updatedDriver = await db_1.default.driver.update({
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
    }
    catch (error) {
        console.error('Error assigning order:', ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error);
        res.status(500).json({ message: 'Failed to assign order.' });
    }
};
exports.assignOrder = assignOrder;
// @desc    Driver: Update order status to 'picked_up'
// @route   PUT /api/logistics/driver/pickup
// @access  Private (Driver Only)
const pickupOrder = async (req, res) => {
    const { orderId } = req.body;
    const driverId = req.user.driverId; // Assumes driverId is attached to the request user object after auth
    try {
        const driver = await db_1.default.driver.findUnique({ where: { id: driverId } });
        const assignedOrders = driver === null || driver === void 0 ? void 0 : driver.assignedOrders;
        if (!driver || !(assignedOrders === null || assignedOrders === void 0 ? void 0 : assignedOrders.some(order => order.orderId === orderId))) {
            return res.status(404).json({ message: 'Order not found or not assigned to this driver.' });
        }
        // Update Order Status in Order Service
        await updateOrderStatus(orderId, 'picked_up', driver.id);
        res.status(200).json({ message: `Order ${orderId} status updated to picked_up.` });
    }
    catch (error) {
        console.error('Error during pickup:', error);
        res.status(500).json({ message: 'Failed to update order status to picked up.' });
    }
};
exports.pickupOrder = pickupOrder;
// @desc    Driver: Update order status to 'delivered'
// @route   PUT /api/logistics/driver/deliver
// @access  Private (Driver Only)
const deliverOrder = async (req, res) => {
    const { orderId } = req.body;
    const driverId = req.user.driverId;
    try {
        const driver = await db_1.default.driver.findUnique({ where: { id: driverId } });
        if (!driver) {
            return res.status(404).json({ message: 'Driver not found.' });
        }
        // Remove order from assigned list
        const currentOrders = driver.assignedOrders;
        const updatedOrders = currentOrders.filter(order => order.orderId !== orderId);
        // If no more deliveries, set status back to 'available'
        const newStatus = updatedOrders.length === 0 ? 'available' : driver.status;
        await db_1.default.driver.update({
            where: { id: driverId },
            data: { assignedOrders: updatedOrders, status: newStatus },
        });
        // Update Order Status in Order Service
        await updateOrderStatus(orderId, 'delivered', driver.id);
        res.status(200).json({ message: `Order ${orderId} successfully delivered.` });
    }
    catch (error) {
        console.error('Error during delivery:', error);
        res.status(500).json({ message: 'Failed to update order status to delivered.' });
    }
};
exports.deliverOrder = deliverOrder;
// @desc    Driver: Update current location
// @route   PUT /api/logistics/driver/location
// @access  Private (Driver Only)
const updateDriverLocation = async (req, res) => {
    const { lat, lng } = req.body;
    const driverId = req.user.driverId;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
        return res.status(400).json({ message: 'Valid latitude and longitude are required.' });
    }
    try {
        const driver = await db_1.default.driver.update({
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
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return res.status(404).json({ message: 'Driver not found.' });
        }
        console.error('Error updating driver location:', error);
        res.status(500).json({ message: 'Failed to update location.' });
    }
};
exports.updateDriverLocation = updateDriverLocation;
