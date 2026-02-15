// backend/logistics-service/src/routes/logisticsRoutes.ts
import { Router } from 'express';
import { createDriver, assignOrder, pickupOrder, deliverOrder, updateDriverLocation } from '../controllers/logisticsController';
import { protect, admin, driver } from '../middlewares/authMiddleware'; // Assumed auth middleware

const router = Router();

// Internal/Admin Routes
router.post('/admin/drivers', protect, admin, createDriver);
router.post('/internal/assign', assignOrder); // NOTE: Should be protected by API Key/IP Whitelisting

// Driver Routes (requires driver role)
router.put('/driver/pickup', protect, driver, pickupOrder);
router.put('/driver/deliver', protect, driver, deliverOrder);
router.put('/driver/location', protect, driver, updateDriverLocation);

export default router;