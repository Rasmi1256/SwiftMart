import { Router } from 'express';
import {
  registerDeliveryPerson,
  loginDeliveryPerson,
  getDeliveryPersonProfile,
  getAssignedOrders,
  updateDeliveryOrderStatus,
  assignOrderToDeliveryPerson, // For admin to use
} from '../controllers/deliveryController';
import { protectDeliveryPerson } from '../middlewares/authMiddleware';

const router = Router();

// Helper to wrap async route handlers
const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).then(() => undefined).catch(next);
};

// Public routes for delivery personnel (registration for testing MVP, should be admin-only later)
router.post('/register', asyncHandler(registerDeliveryPerson));
router.post('/login', asyncHandler(loginDeliveryPerson));

// Private routes for delivery personnel
router.get('/profile', protectDeliveryPerson, asyncHandler(getDeliveryPersonProfile));
router.get('/orders', protectDeliveryPerson, asyncHandler(getAssignedOrders));
router.put('/orders/:orderId/status', protectDeliveryPerson, asyncHandler(updateDeliveryOrderStatus));

// Admin-only route (protected by DeliveryPerson auth for MVP, but needs proper admin role check later)
router.post('/assign-order', protectDeliveryPerson, asyncHandler(assignOrderToDeliveryPerson));


export default router;