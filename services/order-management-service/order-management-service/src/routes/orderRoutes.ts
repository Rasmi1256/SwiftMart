import { Router } from 'express';
import {
  addItemToCart,
  getCart,
  removeItemFromCartByProduct,
  createPendingOrder,
  placeOrder,
  getOrderHistory,
  getOrderDetails,
  getAllOrders,
  updateOrderStatus,
  applyCouponToCart,
  updateOrderStatusInternal,
  updateCartItemQuantityByProduct,
  getPendingOrdersForBatching,
  batchOrdersForRoute,
} from '../controllers/orderController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

/**
 * IMPORTANT:
 * If you mount this as:
 *   app.use('/api', router);
 * then full paths are:
 *   GET    /api/orders/cart
 *   POST   /api/orders/cart/items
 *   PUT    /api/orders/cart/item
 *   DELETE /api/orders/cart/item/:productId
 *   POST   /api/orders/cart/coupon
 *   GET    /api/orders           (order history)
 *   POST   /api/orders/create-pending
 *   POST   /api/orders/place
 *   GET    /api/orders/:orderId
 *   GET    /api/orders/admin/all
 *   PUT    /api/orders/admin/:orderId/status
 *   PUT    /api/orders/internal/status/:orderId
 */

// --- Cart Routes ---
// These routes manage the user's shopping cart.

// Fetch current cart
router.get('/orders/cart', protect, getCart);

// Add item to cart (used by product pages / "Add to cart" button)
router.post('/orders/cart/items', protect, addItemToCart);

// Update quantity of a cart item by productId
router.put('/orders/cart/item', protect, updateCartItemQuantityByProduct);

// Remove item from cart by productId
router.delete('/orders/cart/item/:productId', protect, removeItemFromCartByProduct);

// Apply coupon to current cart
router.post('/orders/cart/coupon', protect, applyCouponToCart);

// --- User Order Routes ---

// Gets the authenticated user's order history
router.get('/orders', protect, getOrderHistory);

// Attach shipping address, keep status 'pending'
router.post('/orders/create-pending', protect, createPendingOrder);

// Place the order (change status from 'pending' to 'placed')
router.post('/orders/place', protect, placeOrder);

// Get details for a specific order belonging to the user
router.get('/orders/:orderId', protect, getOrderDetails);

// --- Admin Routes ---

// Get all orders (admin)
router.get('/orders/admin/all', protect, getAllOrders);

// Update order status (admin)
router.put('/orders/admin/:orderId/status', protect, updateOrderStatus);

// Internal route for service-to-service status updates
router.put('/orders/internal/status/:orderId', protect, updateOrderStatusInternal);

// Route optimization batching routes
router.get('/orders/pending/batch', protect, getPendingOrdersForBatching);
router.post('/orders/batch/route', protect, batchOrdersForRoute);

export default router;
