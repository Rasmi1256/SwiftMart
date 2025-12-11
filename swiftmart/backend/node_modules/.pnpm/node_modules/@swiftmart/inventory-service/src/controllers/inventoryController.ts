import { Request, Response } from 'express';
import prisma from '../db';

// @desc    Get all inventory items
// @route   GET /api/inventory/items
// @access  Public
export const getInventoryItems = async (req: Request, res: Response) => {
  try {
    const items = await prisma.inventoryItem.findMany({
      include: { stockMovements: true },
    });

    res.status(200).json(items);
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).json({ message: 'Server error fetching inventory items.' });
  }
};

// @desc    Get inventory item by ID
// @route   GET /api/inventory/items/:id
// @access  Public
export const getInventoryItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const item = await prisma.inventoryItem.findUnique({
      where: { id },
      include: { stockMovements: true },
    });

    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found.' });
    }

    res.status(200).json(item);
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({ message: 'Server error fetching inventory item.' });
  }
};

// @desc    Create a new inventory item
// @route   POST /api/inventory/admin/items
// @access  Private (Admin Only)
export const createInventoryItem = async (req: Request, res: Response) => {
  try {
    const { productId, quantity, location, minStockLevel, maxStockLevel } = req.body;

    const item = await prisma.inventoryItem.create({
      data: {
        productId,
        quantity,
        location,
        minStockLevel,
        maxStockLevel,
      },
    });

    res.status(201).json({ message: 'Inventory item created successfully.', item });
  } catch (error) {
    console.error('Error creating inventory item:', error);
    res.status(500).json({ message: 'Server error creating inventory item.' });
  }
};

// @desc    Update inventory item
// @route   PUT /api/inventory/admin/items/:id
// @access  Private (Admin Only)
export const updateInventoryItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantity, location, minStockLevel, maxStockLevel } = req.body;

    const item = await prisma.inventoryItem.findUnique({ where: { id } });

    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found.' });
    }

    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: {
        quantity,
        location,
        minStockLevel,
        maxStockLevel,
      },
    });

    res.status(200).json({ message: 'Inventory item updated.', item: updatedItem });
  } catch (error) {
    console.error('Error updating inventory item:', error);
    res.status(500).json({ message: 'Server error updating inventory item.' });
  }
};

// @desc    Adjust stock quantity
// @route   POST /api/inventory/admin/items/:id/adjust
// @access  Private (Admin Only)
export const adjustStock = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantityChange, reason, notes } = req.body;

    const item = await prisma.inventoryItem.findUnique({ where: { id } });

    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found.' });
    }

    const newQuantity = item.quantity + quantityChange;

    if (newQuantity < 0) {
      return res.status(400).json({ message: 'Insufficient stock.' });
    }

    // Update item quantity
    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: { quantity: newQuantity },
    });

    // Record stock movement
    await prisma.stockMovement.create({
      data: {
        inventoryItemId: id,
        quantityChange,
        reason,
        notes,
      },
    });

    res.status(200).json({ message: 'Stock adjusted successfully.', item: updatedItem });
  } catch (error) {
    console.error('Error adjusting stock:', error);
    res.status(500).json({ message: 'Server error adjusting stock.' });
  }
};

// @desc    Get stock movements for an item
// @route   GET /api/inventory/items/:id/movements
// @access  Public
export const getStockMovements = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const movements = await prisma.stockMovement.findMany({
      where: { inventoryItemId: id },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json(movements);
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    res.status(500).json({ message: 'Server error fetching stock movements.' });
  }
};

// @desc    Check low stock alerts
// @route   GET /api/inventory/alerts/low-stock
// @access  Private (Admin Only)
export const getLowStockAlerts = async (req: Request, res: Response) => {
  try {
    const lowStockItems = await prisma.inventoryItem.findMany({
      where: {
        quantity: {
          lte: prisma.inventoryItem.fields.minStockLevel,
        },
      },
    });

    res.status(200).json(lowStockItems);
  } catch (error) {
    console.error('Error fetching low stock alerts:', error);
    res.status(500).json({ message: 'Server error fetching low stock alerts.' });
  }
};
