import express from 'express';
import {
  createDelivery,
  getDelivery,
  updateDeliveryStatus,
  assignDriver,
  getDeliveries,
} from '../controllers/deliveryController';
import {
  updateLocation,
  getPartnerLocation,
  getLocationHistory,
  getMultiplePartnerLocations,
} from '../controllers/locationController';
import { authenticate } from '../middlewares/authMiddleware';

const router = express.Router();

// Admin routes
router.post('/admin/deliveries', authenticate, createDelivery);

// Driver routes
router.put('/driver/deliveries/:id/status', authenticate, updateDeliveryStatus);

// Internal routes
router.post('/internal/assign', assignDriver);

// Public routes
router.get('/deliveries/:id', getDelivery);
router.get('/deliveries', getDeliveries);

// Location routes
router.post('/location/update', authenticate, updateLocation);
router.get('/location/:partnerId', getPartnerLocation);
router.get('/location/:partnerId/history', authenticate, getLocationHistory);
router.get('/location/partners', authenticate, getMultiplePartnerLocations);

export default router;
