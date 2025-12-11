import { Request, Response } from 'express';
import axios from 'axios';
import { config } from '../config';

// Import Prisma client and types
import prisma from '../db';
import type { Order, OrderItem, Prisma } from '../generated/prisma/client';
type OrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>;


// TypeScript interfaces for API responses (to maintain consistency if needed)
export interface IOrderItemResponse {
  id: string;
  orderId: string;
  productId: string;
  name: string; // productName
  imageUrl?: string; // productImageUrl
  price: number; // unitPrice
  quantity: number;
  createdAt?: Date;
}

export interface IOrderResponse {
  id: string;
  userId: string;
  status: string;
  totalAmount: number;
  shippingAddressId?: string | null;
  paymentMethod?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  items?: IOrderItemResponse[];
  couponCode?: string | null;
  discountAmount?: number | null;
  finalTotal?: number | null;
  driverId?: string | null;
}

// Define a type for the product returned by the Product Catalog Service
interface IProductDetails {
  id: string; // Prisma typically uses 'id'
  name: string;
  price: number | string;
  imageUrl?: string;
  isAvailable: boolean;
  // Add other fields as needed
}

// --- Helper functions for inter-service communication (unchanged) ---

const sendNotification = async (userId: string, type: string, message: string, data: any = {}) => {
  try {
    await axios.post(`${config.notificationServiceUrl}/notifications/send`, {
      userId,
      type,
      message,
      data,
    });
    console.log(`Notification sent for user ${userId} (type: ${type})`);
  } catch (error) {
    console.error(`Failed to send notification for user ${userId}:`, (error as any).response?.data || error);
  }
};

// Helper to fetch product details from Product Catalog Service
const getProductDetails = async (productId: string): Promise<IProductDetails | null> => {
  try {
    const response = await axios.get(`${config.productCatalogServiceUrl}/products/${productId}`); // TODO: Check if product service URL is correct
    return response.data as IProductDetails;
  } catch (error) {
    console.error(`Error fetching product ${productId} from Product Catalog Service:`, (error as any).response?.data || error);
    return null;
  }
};

// --- Migrated Controller Functions ---

// @desc    Add item to cart (or create/update pending order)
// @route   POST /api/cart/add
// @access  Private
export const addItemToCart = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, user not found.' });
  }

  const { productId, quantity } = req.body;

  if (!productId || !quantity || quantity <= 0) {
    return res.status(400).json({ message: 'Product ID and a positive quantity are required.' });
  }

  try {
    // 1. Get product details from Product Catalog Service
    const product = await getProductDetails(productId);
    if (!product || !product.isAvailable) {
      return res.status(404).json({ message: 'Product not found or unavailable.' });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 2. Find or create a 'pending' order (cart) for the user
      let order = await tx.order.findFirst({
        where: { userId: req.user!.id, status: 'pending' },
      });

      if (!order) {
        order = await tx.order.create({
          data: {
            userId: req.user!.id,
            status: 'pending',
            totalAmount: 0,
            finalTotal: 0,
          },
        });
      }

      // 3. Check if product already exists in cart
      const existingItem = await tx.orderItem.findFirst({
        where: { orderId: order.id, productId },
      });

      const itemPrice = typeof product.price === 'string' ? parseFloat(product.price) : product.price;

      if (existingItem) {
        // Update quantity of existing item
        await tx.orderItem.update({
          where: { id: existingItem.id },
          data: { quantity: { increment: quantity } },
        });
      } else {
        // Add new item to cart
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId,
            productName: product.name,
            productImageUrl: product.imageUrl,
            unitPrice: itemPrice,
            quantity,
          },
        });
      }

      // 4. Recalculate totalAmount and update the order
      const allItems = await tx.orderItem.findMany({ where: { orderId: order.id } });
      const newTotalAmount = allItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

      const finalOrder = await tx.order.update({
        where: { id: order.id },
        data: { totalAmount: newTotalAmount > 0 ? newTotalAmount : 0 },
        include: { items: true },
      });

      return finalOrder;
    });

    const responseCart = formatOrderResponse(updatedOrder);
    res.status(200).json({ message: 'Item added/updated in cart successfully', cart: responseCart });

  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({ message: 'Server error adding item to cart.' });
  }
};

// Helper to format order object for API responses
const formatOrderResponse = (order: OrderWithItems | null): IOrderResponse | null => {
  if (!order) return null;

  return {
    id: order.id,
    userId: order.userId,
    status: order.status,
    totalAmount: order.totalAmount,
    shippingAddressId: order.shippingAddressId,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.items.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      productId: item.productId,
      name: item.productName,
      imageUrl: item.productImageUrl ?? undefined,
      price: item.unitPrice,
      quantity: item.quantity,
      createdAt: item.createdAt,
    })),
    couponCode: (order as any).couponCode,
    discountAmount: (order as any).discountAmount,
    finalTotal: (order as any).finalTotal,
    driverId: (order as any).driverId,
  };
};

export const getCart = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, user not found.' });
  }

  try {
    console.log('getCart called for user:', req.user.id);

    const order = await prisma.order.findFirst({
      where: { userId: req.user.id, status: 'pending' },
      include: { items: true },
    });

    if (!order) {
      return res.status(200).json(null);
    }

    const items = order.items.map((item) => ({
      productId: item.productId,
      name: item.productName,
      price: item.unitPrice,
      quantity: item.quantity,
      imageUrl: item.productImageUrl ?? undefined,
    }));

    const subtotal = order.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    const shipping = 5.0;
    const taxRate = 0.1;
    const taxAmount = subtotal * taxRate;
    const totalBeforeDiscount = subtotal + shipping + taxAmount;

    const discountAmount =
      (order as any).discountAmount != null
        ? Number((order as any).discountAmount)
        : 0;

    const finalTotal =
      (order as any).finalTotal != null
        ? Number((order as any).finalTotal)
        : totalBeforeDiscount - discountAmount;

    const cartResponse = {
      orderId: order.id,
      items,
      couponCode: (order as any).couponCode ?? null,
      discountAmount,
      finalTotal,
    };

    return res.status(200).json(cartResponse);
  } catch (error) {
    console.error('Error fetching cart:', error);
    return res.status(500).json({ message: 'Server error fetching cart.' });
  }
};

// @desc    Update quantity of an item in cart by productId
// @route   PUT /api/orders/cart/item
// @access  Private
export const updateCartItemQuantityByProduct = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, user not found.' });
  }

  const { productId, quantity } = req.body;

  if (!productId || !quantity || quantity <= 0) {
    return res.status(400).json({ message: 'Product ID and a positive quantity are required.' });
  }

  try {
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Find pending order
      const order = await tx.order.findFirst({
        where: { userId: req.user!.id, status: 'pending' },
        include: { items: true },
      });

      if (!order) {
        throw new Error('Pending cart not found.');
      }

      // Find item by productId within that order
      const item = await tx.orderItem.findFirst({
        where: { orderId: order.id, productId },
      });

      if (!item) {
        throw new Error('Cart item not found.');
      }

      // Update quantity
      await tx.orderItem.update({
        where: { id: item.id },
        data: { quantity },
      });

      // Recalculate total
      const allItems = await tx.orderItem.findMany({ where: { orderId: order.id } });
      const newTotalAmount = allItems.reduce(
        (sum, i) => sum + i.unitPrice * i.quantity,
        0
      );

      const finalOrder = await tx.order.update({
        where: { id: order.id },
        data: { totalAmount: newTotalAmount > 0 ? newTotalAmount : 0 },
        include: { items: true },
      });

      return finalOrder;
    });

    const cartResponse = {
      orderId: updatedOrder.id,
      items: updatedOrder.items.map((item) => ({
        productId: item.productId,
        name: item.productName,
        price: item.unitPrice,
        quantity: item.quantity,
        imageUrl: item.productImageUrl ?? undefined,
      })),
    };

    return res
      .status(200)
      .json({ message: 'Cart item quantity updated successfully', cart: cartResponse });
  } catch (error: any) {
    console.error('Error updating cart item quantity:', error);
    if (error.message.includes('Pending cart not found') || error.message.includes('Cart item not found')) {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Server error updating cart item quantity.' });
  }
};

// @desc    Remove item from cart by productId
// @route   DELETE /api/orders/cart/item/:productId
// @access  Private
export const removeItemFromCartByProduct = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, user not found.' });
  }

  const { productId } = req.params;

  try {
    const result = await prisma.$transaction(
      async (tx): Promise<{ order: OrderWithItems; isEmpty: boolean }> => {
        // Find pending order for this user
        const order = await tx.order.findFirst({
          where: { userId: req.user!.id, status: 'pending' },
          include: { items: true },
        });

        if (!order) {
          throw new Error('Pending cart not found.');
        }

        const item = await tx.orderItem.findFirst({
          where: { orderId: order.id, productId },
        });

        if (!item) {
          throw new Error('Cart item not found.');
        }

        // Delete the item
        await tx.orderItem.delete({ where: { id: item.id } });

        const remainingItems = await tx.orderItem.findMany({
          where: { orderId: order.id },
        });

        if (remainingItems.length === 0) {
          const cancelledOrder = await tx.order.update({
            where: { id: order.id },
            data: { status: 'cancelled', totalAmount: 0 },
            include: { items: true }, // still included, but empty
          });
          return { order: cancelledOrder, isEmpty: true };
        } else {
          const newTotalAmount = remainingItems.reduce(
            (sum, i) => sum + i.unitPrice * i.quantity,
            0
          );
          const updatedOrder = await tx.order.update({
            where: { id: order.id },
            data: { totalAmount: newTotalAmount },
            include: { items: true },
          });
          return { order: updatedOrder, isEmpty: false };
        }
      }
    );

    const updatedCart = result.isEmpty ? null : formatOrderResponse(result.order);

    return res.status(200).json({
      message: 'Item removed from cart successfully',
      cart: updatedCart,
    });
  } catch (error: any) {
    console.error('Error removing item from cart:', error);
    if (
      typeof error.message === 'string' &&
      (error.message.includes('Pending cart not found') ||
        error.message.includes('Cart item not found'))
    ) {
      return res.status(404).json({ message: error.message });
    }
    return res.status(500).json({ message: 'Server error removing item from cart.' });
  }
};

export const createPendingOrder = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, user not found.' });
  }

  const { shippingAddressId } = req.body;

  if (!shippingAddressId) {
    return res.status(400).json({ message: 'Shipping address is required.' });
  }

  try {
    const order = await prisma.order.findFirst({
      where: { userId: req.user!.id, status: 'pending' },
    });

    if (!order) {
      return res.status(404).json({ message: 'No pending order (cart) found to place.' });
    }

    if (order.totalAmount <= 0) {
        return res.status(400).json({ message: 'Cannot place an empty order.' });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: { shippingAddressId },
      include: { items: true },
    });

    // Send notification for Order Pending
    sendNotification(
      updatedOrder.userId,
      'order_pending',
      `Your order #${updatedOrder.id.substring(0, 8)} is pending payment.`,
      { orderId: updatedOrder.id, status: updatedOrder.status }
    );

    res.status(200).json({
      message: 'Order updated with shipping, pending payment.',
      order: formatOrderResponse(updatedOrder),
    });
  } catch (error) {
    console.error('Error creating pending order:', error);
    res.status(500).json({ message: 'Server error creating pending order.' });
  }
};

// @desc    Place the order (change status from 'pending' to 'placed')
// @route   POST /api/orders/place
// @access  Private
export const placeOrder = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, user not found.' });
  }

  const { orderId, paymentMethod } = req.body;

  if (!orderId || !paymentMethod) {
    return res.status(400).json({ message: 'Order ID and payment method are required.' });
  }

  try {
    const placedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, userId: req.user!.id, status: 'pending' },
        include: { items: true },
      });

      if (!order) {
        throw new Error('Pending order not found.');
      }

      if (order.totalAmount <= 0 || order.items.length === 0) {
        throw new Error('Cannot place an empty order.');
      }

      const inventoryUpdatePayload = order.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
      }));

      try {
        await axios.post(`${config.inventoryServiceUrl}/inventory/deduct`, {
          items: inventoryUpdatePayload,
        });
      } catch (inventoryError: any) {
        // Re-throw a specific error to be caught by the outer catch block
        const errorData = inventoryError.response?.data;
        const errorMessage = errorData?.message || 'Failed to deduct stock.';
        const outOfStockItems = errorData?.outOfStockItems;
        const customError = new Error(errorMessage) as any;
        customError.status = inventoryError.response?.status || 500;
        customError.outOfStockItems = outOfStockItems;
        throw customError;
      }

      const finalOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'placed',
          paymentMethod,
        },
        include: { items: true },
      });

      return finalOrder;
    });

    sendNotification(
      placedOrder.userId,
      'order_placed',
      `Your order #${placedOrder.id.substring(0, 8)} has been placed successfully!`,
      { orderId: placedOrder.id, status: placedOrder.status }
    );

    res.status(200).json({
      message: 'Order placed successfully',
      order: formatOrderResponse(placedOrder),
    });
  } catch (error: any) {
    console.error('Error placing order:', error);
    if (error.status === 409) {
        return res.status(409).json({
            message: error.message,
            outOfStockItems: error.outOfStockItems,
        });
    }
    if (error.message.includes('Pending order not found') || error.message.includes('Cannot place an empty order')) {
        return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error placing order.' });
  }
};


// @desc    Get user's order history
// @route   GET /api/orders
// @access  Private
export const getOrderHistory = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, user not found.' });
  }

  try {
    const orders = await prisma.order.findMany({
      where: {
        userId: req.user!.id,
        NOT: { status: 'pending' },
      },
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    res.status(200).json({
      message: 'Order history fetched successfully',
      // Format orders to be consistent with other endpoints
      orders: orders.map(formatOrderResponse),
    });
  } catch (error) {
    console.error('Error fetching order history:', error);
    res.status(500).json({ message: 'Server error fetching order history.' });
  }
};

// @desc    Get specific order details
// @route   GET /api/orders/:orderId
// @access  Private
export const getOrderDetails = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, user not found.' });
  }

  const { orderId } = req.params;

  try {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: req.user!.id },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or does not belong to this user.' });
    }

    res.status(200).json({
      message: 'Order details fetched successfully',
      order: formatOrderResponse(order),
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ message: 'Server error fetching order details.' });
  }
};


// @desc    Admin: Get all orders
// @route   GET /api/admin/orders
// @access  Private (Admin Only)
export const getAllOrders = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, user not found.' });
  }

  try {
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true },
    });

    res.status(200).json({
      message: 'All orders fetched successfully',
      orders: orders.map(formatOrderResponse),
    });
  } catch (error) {
    console.error('Error fetching all orders (admin):', error);
    res.status(500).json({ message: 'Server error fetching all orders.' });
  }
};

// @desc    Update order status (for admin panel)
// @route   PUT /api/admin/orders/:orderId
// @access  Private (Admin Only)
export const updateOrderStatus = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, user not found.' });
  }

  const { orderId } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'Order status is required.' });
  }

  const validStatuses = ['pending', 'placed', 'assigned', 'picked_up', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: `Invalid status provided. Must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const oldStatus = order.status;

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: { items: true },
    });

    if (oldStatus !== status) {
      sendNotification(
        updatedOrder.userId,
        'order_status_update',
        `Your order #${updatedOrder.id.substring(0, 8)}... status changed from ${oldStatus} to ${status}.`,
        { orderId: updatedOrder.id, oldStatus, newStatus: status }
      );
    }

    res.status(200).json({
      message: `Order ${orderId} status updated to ${status} successfully`,
      order: formatOrderResponse(updatedOrder),
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Server error updating order status.' });
  }
};
export const applyCouponToCart = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized.' });
  }

  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ message: 'Coupon code is required.' });
  }

  try {
    const order = await prisma.order.findFirst({
      where: { userId: req.user!.id, status: 'pending' },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ message: 'No pending order found to apply coupon.' });
    }

    const currentSubtotal = order.items.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);

    const couponValidationResponse = await axios.post(
      `${config.promotionsServiceUrl}/promotions/validate`,
      {
        code,
        orderTotal: currentSubtotal,
        itemIds: order.items.map(item => item.productId),
      },
      { headers: { Authorization: req.headers.authorization } }
    );

    const { discountAmount } = couponValidationResponse.data as { discountAmount: number };

    const shipping = 5.0;
    const taxRate = 0.10;
    const totalBeforeDiscount = currentSubtotal + shipping + (currentSubtotal * taxRate);
    const newFinalTotal = totalBeforeDiscount - discountAmount;

    await prisma.order.update({
      where: { id: order.id },
      data: {
        couponCode: code,
        discountAmount,
        finalTotal: newFinalTotal,
      },
    });

    res.status(200).json({
      message: `Coupon ${code} applied. Discount: $${discountAmount.toFixed(2)}`,
      orderId: order.id,
      finalTotal: newFinalTotal,
      discountAmount,
    });

  } catch (error: any) {
    console.error('Error applying coupon:', error.response?.data || error);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || 'Failed to apply coupon.'
    });
  }
};

// --- Internal Endpoints ---

const broadcastOrderStatus = async (order: Order & { driverId?: string | null }) => {
    try {
        // Fetch driver's last known location if order is assigned/picked_up
        let driverLocation = null;
        if (order.driverId && (order.status === 'assigned' || order.status === 'picked_up')) {
            // NOTE: In a real system, you'd call the Logistics service to get this.
            // For MVP, we'll mock it or pass null.
            // driverLocation = await axios.get(`${config.logisticsServiceUrl}/logistics/driver/location/${order.driverId}`);
        }

        await axios.post(
            `${config.notificationServiceUrl}/notifications/broadcast`,
            {
                userId: order.userId,
                orderId: order.id,
                newStatus: order.status,
                driverLocation: driverLocation,
            }
        );
        console.log(`Broadcasted status update for Order ${order.id}`);
    } catch (error) {
        console.error('Failed to broadcast status update:', (error as any).response?.data || error);
    }
};

// @desc    Internal: Update order status (called by other services)
// @route   PUT /api/orders/internal/status/:orderId
// @access  Internal
export const updateOrderStatusInternal = async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { status, driverId } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'New status is required.' });
  }

    const validStatuses = ['pending', 'placed', 'assigned', 'picked_up', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status: ${status}` });
    }

  try {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
            status,
            ...(driverId && { driverId }), // Conditionally update driverId
        },
    });
    
    broadcastOrderStatus(updatedOrder);
    
    res.status(200).json({ message: `Order ${orderId} status updated to ${status}.`, order: updatedOrder });
  } catch (error) {
    console.error('Error updating order status internally:', error);
    res.status(500).json({ message: 'Server error updating order status.' });
  }
};
