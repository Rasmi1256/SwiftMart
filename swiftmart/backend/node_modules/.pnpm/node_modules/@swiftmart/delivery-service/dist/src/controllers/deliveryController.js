"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignDriver = exports.updateDeliveryStatus = exports.getDeliveries = exports.getDelivery = exports.createDelivery = void 0;
const db_1 = __importDefault(require("../db"));
// @desc    Create a new delivery
// @route   POST /api/delivery/admin/deliveries
// @access  Private (Admin Only)
const createDelivery = async (req, res) => {
    try {
        const { orderId, driverId, deliveryAddress, estimatedDeliveryTime, notes } = req.body;
        const delivery = await db_1.default.delivery.create({
            data: {
                orderId,
                driverId,
                deliveryAddress,
                estimatedDeliveryTime: estimatedDeliveryTime ? new Date(estimatedDeliveryTime) : undefined,
                notes,
            },
        });
        res.status(201).json({ message: 'Delivery created successfully.', delivery });
    }
    catch (error) {
        console.error('Error creating delivery:', error);
        res.status(500).json({ message: 'Server error creating delivery.' });
    }
};
exports.createDelivery = createDelivery;
// @desc    Get delivery by ID
// @route   GET /api/delivery/deliveries/:id
// @access  Public
const getDelivery = async (req, res) => {
    try {
        const { id } = req.params;
        const delivery = await db_1.default.delivery.findUnique({
            where: { id },
            include: { driver: true },
        });
        if (!delivery) {
            return res.status(404).json({ message: 'Delivery not found.' });
        }
        res.status(200).json(delivery);
    }
    catch (error) {
        console.error('Error fetching delivery:', error);
        res.status(500).json({ message: 'Server error fetching delivery.' });
    }
};
exports.getDelivery = getDelivery;
// @desc    Get all deliveries
// @route   GET /api/delivery/deliveries
// @access  Public
const getDeliveries = async (req, res) => {
    try {
        const deliveries = await db_1.default.delivery.findMany({
            include: { driver: true },
        });
        res.status(200).json(deliveries);
    }
    catch (error) {
        console.error('Error fetching deliveries:', error);
        res.status(500).json({ message: 'Server error fetching deliveries.' });
    }
};
exports.getDeliveries = getDeliveries;
// @desc    Update delivery status
// @route   PUT /api/delivery/driver/deliveries/:id/status
// @access  Private (Driver Only)
const updateDeliveryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, actualDeliveryTime } = req.body;
        const driverId = req.user.driverId;
        const delivery = await db_1.default.delivery.findUnique({ where: { id } });
        if (!delivery || delivery.driverId !== driverId) {
            return res.status(404).json({ message: 'Delivery not found or not assigned to this driver.' });
        }
        const updateData = { status };
        if (status === 'delivered' && actualDeliveryTime) {
            updateData.actualDeliveryTime = new Date(actualDeliveryTime);
        }
        const updatedDelivery = await db_1.default.delivery.update({
            where: { id },
            data: updateData,
        });
        res.status(200).json({ message: 'Delivery status updated.', delivery: updatedDelivery });
    }
    catch (error) {
        console.error('Error updating delivery status:', error);
        res.status(500).json({ message: 'Server error updating delivery status.' });
    }
};
exports.updateDeliveryStatus = updateDeliveryStatus;
// @desc    Assign driver to delivery
// @route   POST /api/delivery/internal/assign
// @access  Internal
const assignDriver = async (req, res) => {
    try {
        const { orderId, driverId } = req.body;
        const delivery = await db_1.default.delivery.findUnique({ where: { orderId } });
        if (!delivery) {
            return res.status(404).json({ message: 'Delivery not found.' });
        }
        const updatedDelivery = await db_1.default.delivery.update({
            where: { id: delivery.id },
            data: { driverId, status: 'assigned' },
        });
        res.status(200).json({ message: 'Driver assigned to delivery.', delivery: updatedDelivery });
    }
    catch (error) {
        console.error('Error assigning driver:', error);
        res.status(500).json({ message: 'Server error assigning driver.' });
    }
};
exports.assignDriver = assignDriver;
