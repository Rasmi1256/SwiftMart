import express from 'express';
import {
  getInventoryItems,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  adjustStock,
  getStockMovements,
  getLowStockAlerts,
  getBatchStockStatus,
} from '../controllers/inventoryController';
import { authenticate } from '../middlewares/authMiddleware';

const router = express.Router();

// Public routes
router.get('/items', getInventoryItems);
router.get('/items/:id', getInventoryItem);
router.get('/items/:id/movements', getStockMovements);
router.post('/batch', getBatchStockStatus);

// Admin-only routes (require authentication)
router.post('/admin/items', authenticate, createInventoryItem);
router.put('/admin/items/:id', authenticate, updateInventoryItem);
router.post('/admin/items/:id/adjust', authenticate, adjustStock);
router.get('/alerts/low-stock', authenticate, getLowStockAlerts);

export default router;
