import { Router } from 'express';
import {
  addItemToCart,
  getCart,
  updateCartItemQuantity,
  removeItemFromCart,
  placeOrder,
  getOrderHistory,
  getOrderDetails,
  getAllOrders,        // NEW
  updateOrderStatus,   // NEW
} from '../controllers/orderController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// Cart routes (protected)
router.post('/cart/add', protect, addItemToCart);
router.get('/cart', protect, getCart);
router.put('/cart/update/:itemId', protect, updateCartItemQuantity);
router.delete('/cart/remove/:itemId', protect, removeItemFromCart);

// Order routes (protected for regular users)
router.post('/orders/place', protect, placeOrder);
router.get('/orders', protect, getOrderHistory); // User's own order history
router.get('/orders/:orderId', protect, getOrderDetails); // User's specific order details

// Admin routes (Protected, and in a real app would require an additional 'authorize' middleware for roles)
router.get('/admin/orders', protect, getAllOrders);           // NEW
router.put('/admin/orders/:orderId', protect, updateOrderStatus); // NEW

export default router;