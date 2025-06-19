import { Request, Response } from 'express';
import axios from 'axios';
import { config } from '../config';
import Order from '../models/Order';      // Import Mongoose Order model
import OrderItem from '../models/OrderItem'; // Import Mongoose OrderItem model
import mongoose from 'mongoose';         // Import mongoose for sessions/transactions
import { OrderStatus } from '../models/Order'; // Import OrderStatus type for validation

// TypeScript interfaces for order and order item
export interface IOrderItem {
  _id: string;
  orderId: string;
  productId: string;
  productName: string;
  productImageUrl: string;
  unitPrice: number;
  quantity: number;
}

export interface IOrder {
  _id: string;
  userId: string;
  status: string;
  totalAmount: number;
  shippingAddressId?: string;
  paymentMethod?: string;
  createdAt?: Date;
  updatedAt?: Date;
  items?: IOrderItem[];
}

// Helper to fetch product details from Product Catalog Service
const getProductDetails = async (productId: string) => {
  try {
    const response = await axios.get(`${config.productCatalogServiceUrl}/products/${productId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching product ${productId} from Product Catalog Service:`, (error as any).response?.data || error);
    return null;
  }
};

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

  const session = await mongoose.startSession(); // Start Mongoose session for transaction
  session.startTransaction(); // Begin transaction

  try {
    // 1. Get product details from Product Catalog Service
    const product = await getProductDetails(productId);
    if (!product || !product.isAvailable) { // Also check product availability
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Product not found or unavailable.' });
    }

    // 2. Find or create a 'pending' order (cart) for the user
    let order = await Order.findOne({ userId: req.user.id, status: 'pending' }).session(session) as (mongoose.Document & IOrder) | null;

    if (!order) {
      // No pending order, create a new one
      order = new Order({
        userId: req.user.id,
        status: 'pending',
        totalAmount: 0, // Initial total amount is 0
      }) as mongoose.Document & IOrder;
      await order.save({ session });
    }

    // 3. Check if product already exists in cart
    let existingItem = await OrderItem.findOne({ orderId: order._id, productId }).session(session);

    const itemPrice = parseFloat(product.price);
    const itemSubtotal = itemPrice * quantity;

    if (existingItem) {
      // Update quantity of existing item
      existingItem.quantity += quantity;
      await existingItem.save({ session });
    } else {
      // Add new item to cart
      const newItem = new OrderItem({
        orderId: order._id,
        productId,
        productName: product.name,
        productImageUrl: product.imageUrl,
        unitPrice: itemPrice,
        quantity,
      });
      await newItem.save({ session });
    }

    // Recalculate totalAmount by summing all order items
    const allItems = await OrderItem.find({ orderId: order._id }).session(session);
    order.totalAmount = allItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    // Ensure totalAmount is not negative
    if (order.totalAmount < 0) {
      order.totalAmount = 0;
    }

    // 4. Update order total amount and save
    await order.save({ session }); // Save order after total amount update

    await session.commitTransaction(); // Commit transaction
    session.endSession();

    const updatedCart = await getCartDetails(order._id.toString()); // Helper to get full cart details
    res.status(200).json({ message: 'Item added/updated in cart successfully', cart: updatedCart });

  } catch (error) {
    await session.abortTransaction(); // Rollback transaction on error
    session.endSession();
    console.error('Error adding item to cart:', error);
    res.status(500).json({ message: 'Server error adding item to cart.' });
  }
};

// Helper to get full cart/order details
const getCartDetails = async (orderId: string) => {
  const order = await Order.findById(orderId);
  if (!order) return null;

  const items = await OrderItem.find({ orderId: order._id });
  // Attach items to order object (for response, not stored in DB this way)
  const orderObj = order.toObject() as any;

  // Ensure totalAmount is a valid number
  let totalAmount = orderObj.totalAmount;
  if (typeof totalAmount !== 'number' || isNaN(totalAmount)) {
    totalAmount = 0;
  }

  const orderWithItems: IOrder = {
    ...orderObj,
    id: (orderObj._id as mongoose.Types.ObjectId).toString(),
    user_id: orderObj.userId,
    status: orderObj.status,
    total_amount: totalAmount,
    shipping_address_id: orderObj.shippingAddressId,
    payment_method: orderObj.paymentMethod,
    created_at: orderObj.createdAt,
    updated_at: orderObj.updatedAt,
    items: items.map(item => {
      const itemObj = item.toObject();

      // Ensure unitPrice and quantity are valid numbers
      let unitPrice = itemObj.unitPrice;
      if (typeof unitPrice !== 'number' || isNaN(unitPrice)) {
        unitPrice = 0;
      }
      let quantity = itemObj.quantity;
      if (typeof quantity !== 'number' || isNaN(quantity)) {
        quantity = 0;
      }

      return {
        id: (itemObj._id as mongoose.Types.ObjectId).toString(),
        order_id: itemObj.orderId.toString(),
        product_id: itemObj.productId,
        product_name: itemObj.productName,
        product_image_url: itemObj.productImageUrl,
        unit_price: unitPrice,
        quantity: quantity,
        created_at: itemObj.createdAt,
      };
    }),
  };

  return orderWithItems;
};

// @desc    Get user's current cart (pending order)
// @route   GET /api/cart
// @access  Private
export const getCart = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, user not found.' });
  }

  try {
    const order = await Order.findOne({ userId: req.user.id, status: 'pending' }) as (IOrder & mongoose.Document) | null;

    if (!order) {
      return res.status(200).json({ message: 'Cart is empty.', cart: null });
    }

    const cart = await getCartDetails(order._id.toString());
    res.status(200).json({ message: 'Cart fetched successfully', cart });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ message: 'Server error fetching cart.' });
  }
};

// @desc    Update quantity of an item in cart
// @route   PUT /api/cart/update/:itemId
// @access  Private
export const updateCartItemQuantity = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, user not found.' });
  }

  const { itemId } = req.params;
  const { quantity } = req.body;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ message: 'Quantity must be a positive number.' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the order item and its associated order (must be pending)
    const item = await OrderItem.findById(itemId).session(session);
    if (!item) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Cart item not found.' });
    }

    const order = await Order.findOne({ _id: item.orderId, userId: req.user.id, status: 'pending' }).session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Order not found or does not belong to your pending cart.' });
    }

    // Update item quantity
    item.quantity = quantity;
    await item.save({ session });

    // Recalculate totalAmount by summing all order items
    const allItems = await OrderItem.find({ orderId: order._id }).session(session);
    order.totalAmount = allItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    // Ensure totalAmount is not negative
    if (order.totalAmount < 0) {
      order.totalAmount = 0;
    }

    await order.save({ session });

    await session.commitTransaction();
    session.endSession();

    const updatedCart = await getCartDetails((order._id as mongoose.Types.ObjectId).toString());
    res.status(200).json({ message: 'Cart item quantity updated successfully', cart: updatedCart });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error updating cart item quantity:', error);
    res.status(500).json({ message: 'Server error updating cart item quantity.' });
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove/:itemId
// @access  Private
export const removeItemFromCart = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, user not found.' });
  }

  const { itemId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Find the order item and its associated order
    const item = await OrderItem.findById(itemId).session(session);
    if (!item) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Cart item not found.' });
    }

    const order = await Order.findOne({ _id: item.orderId, userId: req.user.id, status: 'pending' }).session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Order not found or does not belong to your pending cart.' });
    }

    // Delete item from order_items
    await OrderItem.deleteOne({ _id: itemId }).session(session);

    // Recalculate totalAmount by summing all order items
    const allItems = await OrderItem.find({ orderId: order._id }).session(session);
    order.totalAmount = allItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

    // Ensure totalAmount is not negative
    if (order.totalAmount < 0) {
      order.totalAmount = 0;
    }

    // If cart becomes empty, update order status to 'cancelled' (or delete it)
    const remainingItemsCount = await OrderItem.countDocuments({ orderId: order._id }).session(session);
    if (remainingItemsCount === 0) {
        order.status = 'cancelled';
        await order.save({ session });
    } else {
        await order.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    const updatedCart = (order.status === 'pending' && order.totalAmount > 0) ? await getCartDetails((order._id as mongoose.Types.ObjectId).toString()) : null;
    res.status(200).json({ message: 'Item removed from cart successfully', cart: updatedCart });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error removing item from cart:', error);
    res.status(500).json({ message: 'Server error removing item from cart.' });
  }
};

// @desc    Place the order (change status from 'pending' to 'placed')
// @route   POST /api/orders/place
// @access  Private
export const placeOrder = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, user not found.' });
  }

  const { shippingAddressId, paymentMethod } = req.body;

  if (!shippingAddressId || !paymentMethod) {
    return res.status(400).json({ message: 'Shipping address and payment method are required.' });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Find the user's pending order (cart)
    const order = await Order.findOne({ userId: req.user.id, status: 'pending' }).session(session);

    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'No pending order (cart) found to place.' });
    }

    if (order.totalAmount <= 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: 'Cannot place an empty order.' });
    }

    // 2. Validate shipping address (optional for MVP, but crucial in real app)
    // In a real app, you'd call the User Service to validate shippingAddressId belongs to req.user.id
    // For now, we'll just assume it's valid if provided.

    // 3. Update order status to 'placed' and add shipping/payment details
    order.status = 'placed';
    order.shippingAddressId = shippingAddressId;
    order.paymentMethod = paymentMethod;
    await order.save({ session }); // Save the updated order

    // 4. Fetch order items for the newly placed order
    const items = await OrderItem.find({ orderId: order._id }).session(session);

    await session.commitTransaction(); // Commit transaction
    session.endSession();

    const orderObj = order.toObject() as any;
    const placedOrder: IOrder = {
      ...orderObj,
      _id: (orderObj._id as mongoose.Types.ObjectId).toString(),
      items: items.map(item => {
        const itemObj = item.toObject();
        return {
          ...itemObj,
          _id: (itemObj._id as mongoose.Types.ObjectId).toString(),
          orderId: itemObj.orderId.toString(),
        } as IOrderItem;
      }),
    };

    res.status(200).json({
      message: 'Order placed successfully',
      order: placedOrder,
    });
  } catch (error) {
    await session.abortTransaction(); // Rollback transaction on error
    session.endSession();
    console.error('Error placing order:', error);
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
    // Exclude 'pending' orders (carts) from history
    const orders = await Order.find({ userId: req.user.id, status: { $ne: 'pending' } })
                               .sort({ createdAt: -1 })
                               .select('-__v'); // Exclude mongoose version key

    res.status(200).json({
      message: 'Order history fetched successfully',
      orders: orders.map(order => order.toJSON()), // Convert to plain JS objects
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
    const order = await Order.findOne({ _id: orderId, userId: req.user.id });

    if (!order) {
      return res.status(404).json({ message: 'Order not found or does not belong to this user.' });
    }

    const items = await OrderItem.find({ orderId: order._id });

    const orderObj = order.toObject() as any;
    const orderWithItems: IOrder = {
      ...orderObj,
      _id: (orderObj._id as mongoose.Types.ObjectId).toString(),
      items: items.map(item => {
        const itemObj = item.toObject();
        return {
          ...itemObj,
          _id: (itemObj._id as mongoose.Types.ObjectId).toString(),
          orderId: itemObj.orderId.toString(),
        } as IOrderItem;
      }),
    };

    res.status(200).json({
      message: 'Order details fetched successfully',
      order: orderWithItems,
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ message: 'Server error fetching order details.' });
  }
};



export const getAllOrders = async (req: Request, res: Response) => {
  // In a real application, you would add a role-based authorization middleware here
  // e.g., authorize(['admin', 'operations'])
  // For MVP, we assume anyone authenticated to this endpoint is an admin.
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, user not found.' });
  }

  try {
    const orders = await Order.find().sort({ createdAt: -1 }).select('-__v'); // Exclude mongoose version key

    // Optionally populate items directly here for convenience, or fetch on demand
    const ordersWithItems = await Promise.all(orders.map(async (order) => {
        const items = await OrderItem.find({ orderId: order._id });
        const orderObj = order.toObject() as any;
        const orderWithItems: IOrder = {
            ...orderObj,
            _id: (orderObj._id as mongoose.Types.ObjectId).toString(),
            items: items.map(item => {
                const itemObj = item.toObject();
                return {
                    ...itemObj,
                    _id: (itemObj._id as mongoose.Types.ObjectId).toString(),
                    orderId: itemObj.orderId.toString(),
                } as IOrderItem;
            }),
        };
        return orderWithItems;
    }));

    res.status(200).json({
      message: 'All orders fetched successfully',
      orders: ordersWithItems,
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
  // Again, add role-based authorization middleware here in a real app
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, user not found.' });
  }

  const { orderId } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ message: 'Order status is required.' });
  }

  // Basic validation for allowed statuses
  const validStatuses: OrderStatus[] = ['placed', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: `Invalid status provided. Must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    // Prevent changing status from delivered/cancelled unless specific logic is added
    if (['delivered', 'cancelled'].includes(order.status) && order.status !== status) {
        // You might want to prevent or log attempts to change status after final states
        // For MVP, we'll allow it for flexibility in testing.
        console.warn(`Attempt to change status of order ${order.id} from final state ${order.status} to ${status}`);
    }

    order.status = status;
    await order.save(); // Mongoose pre-save hook will update 'updatedAt'

    const updatedOrder = await getCartDetails(String(order._id)); // Re-use helper to get order with items

    res.status(200).json({
      message: `Order ${orderId} status updated to ${status} successfully`,
      order: updatedOrder,
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Server error updating order status.' });
  }
};