// backend/promotions-service/src/routes/couponRoutes.ts
import { Router } from 'express';
import { createCoupon, validateAndApplyCoupon, markCouponAsUsed } from '../controllers/couponController';
import { protect, admin } from '../middlewares/authMiddleware'; // Assumed auth middleware
const router = Router();
// Customer Endpoint
router.post('/validate', protect, validateAndApplyCoupon);
// Internal Endpoint (Order Service will call this)
router.put('/internal/use', markCouponAsUsed);
// Admin Endpoint
router.post('/admin/coupons', protect, admin, createCoupon);
export default router;
