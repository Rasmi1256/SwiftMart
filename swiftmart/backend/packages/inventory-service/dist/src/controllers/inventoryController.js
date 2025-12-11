"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLowStockAlerts = exports.getStockMovements = exports.adjustStock = exports.updateInventoryItem = exports.createInventoryItem = exports.getInventoryItem = exports.getInventoryItems = void 0;
const db_1 = __importDefault(require("../db"));
// @desc    Get all inventory items
// @route   GET /api/inventory/items
// @access  Public
const getInventoryItems = async (req, res) => {
    try {
        const items = await db_1.default.inventoryItem.findMany({
            include: { stockMovements: true },
        });
        res.status(200).json(items);
    }
    catch (error) {
        console.error('Error fetching inventory items:', error);
        res.status(500).json({ message: 'Server error fetching inventory items.' });
    }
};
exports.getInventoryItems = getInventoryItems;
// @desc    Get inventory item by ID
// @route   GET /api/inventory/items/:id
// @access  Public
const getInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const item = await db_1.default.inventoryItem.findUnique({
            where: { id },
            include: { stockMovements: true },
        });
        if (!item) {
            return res.status(404).json({ message: 'Inventory item not found.' });
        }
        res.status(200).json(item);
    }
    catch (error) {
        console.error('Error fetching inventory item:', error);
        res.status(500).json({ message: 'Server error fetching inventory item.' });
    }
};
exports.getInventoryItem = getInventoryItem;
// @desc    Create a new inventory item
// @route   POST /api/inventory/admin/items
// @access  Private (Admin Only)
const createInventoryItem = async (req, res) => {
    try {
        const { productId, quantity, location, minStockLevel, maxStockLevel } = req.body;
        const item = await db_1.default.inventoryItem.create({
            data: {
                productId,
                quantity,
                location,
                minStockLevel,
                maxStockLevel,
            },
        });
        res.status(201).json({ message: 'Inventory item created successfully.', item });
    }
    catch (error) {
        console.error('Error creating inventory item:', error);
        res.status(500).json({ message: 'Server error creating inventory item.' });
    }
};
exports.createInventoryItem = createInventoryItem;
// @desc    Update inventory item
// @route   PUT /api/inventory/admin/items/:id
// @access  Private (Admin Only)
const updateInventoryItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity, location, minStockLevel, maxStockLevel } = req.body;
        const item = await db_1.default.inventoryItem.findUnique({ where: { id } });
        if (!item) {
            return res.status(404).json({ message: 'Inventory item not found.' });
        }
        const updatedItem = await db_1.default.inventoryItem.update({
            where: { id },
            data: {
                quantity,
                location,
                minStockLevel,
                maxStockLevel,
            },
        });
        res.status(200).json({ message: 'Inventory item updated.', item: updatedItem });
    }
    catch (error) {
        console.error('Error updating inventory item:', error);
        res.status(500).json({ message: 'Server error updating inventory item.' });
    }
};
exports.updateInventoryItem = updateInventoryItem;
// @desc    Adjust stock quantity
// @route   POST /api/inventory/admin/items/:id/adjust
// @access  Private (Admin Only)
const adjustStock = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantityChange, reason, notes } = req.body;
        const item = await db_1.default.inventoryItem.findUnique({ where: { id } });
        if (!item) {
            return res.status(404).json({ message: 'Inventory item not found.' });
        }
        const newQuantity = item.quantity + quantityChange;
        if (newQuantity < 0) {
            return res.status(400).json({ message: 'Insufficient stock.' });
        }
        // Update item quantity
        const updatedItem = await db_1.default.inventoryItem.update({
            where: { id },
            data: { quantity: newQuantity },
        });
        // Record stock movement
        await db_1.default.stockMovement.create({
            data: {
                inventoryItemId: id,
                quantityChange,
                reason,
                notes,
            },
        });
        res.status(200).json({ message: 'Stock adjusted successfully.', item: updatedItem });
    }
    catch (error) {
        console.error('Error adjusting stock:', error);
        res.status(500).json({ message: 'Server error adjusting stock.' });
    }
};
exports.adjustStock = adjustStock;
// @desc    Get stock movements for an item
// @route   GET /api/inventory/items/:id/movements
// @access  Public
const getStockMovements = async (req, res) => {
    try {
        const { id } = req.params;
        const movements = await db_1.default.stockMovement.findMany({
            where: { inventoryItemId: id },
            orderBy: { createdAt: 'desc' },
        });
        res.status(200).json(movements);
    }
    catch (error) {
        console.error('Error fetching stock movements:', error);
        res.status(500).json({ message: 'Server error fetching stock movements.' });
    }
};
exports.getStockMovements = getStockMovements;
// @desc    Check low stock alerts
// @route   GET /api/inventory/alerts/low-stock
// @access  Private (Admin Only)
const getLowStockAlerts = async (req, res) => {
    try {
        const lowStockItems = await db_1.default.inventoryItem.findMany({
            where: {
                quantity: {
                    lte: db_1.default.inventoryItem.fields.minStockLevel,
                },
            },
        });
        res.status(200).json(lowStockItems);
    }
    catch (error) {
        console.error('Error fetching low stock alerts:', error);
        res.status(500).json({ message: 'Server error fetching low stock alerts.' });
    }
};
exports.getLowStockAlerts = getLowStockAlerts;
