import { Schema, model, Document } from 'mongoose';
import { IOrderItem } from './OrderItem'; // Import OrderItem interface

export type OrderStatus = 'pending' | 'placed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface IOrder extends Document {
  userId: string; // Storing as string as it's from User Service (MongoDB ObjectId as string)
  status: OrderStatus;
  totalAmount: number;
  shippingAddressId?: string; // Storing as string as it's from User Service (MongoDB ObjectId as string)
  paymentMethod?: string;
  createdAt: Date;
  updatedAt: Date;
  // This will be populated or retrieved separately, not directly embedded
  items?: IOrderItem[];
}

const OrderSchema = new Schema<IOrder>({
  userId: {
    type: String, // Store as string
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['pending', 'placed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
    required: true,
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  shippingAddressId: {
    type: String, // Store as string
    trim: true,
  },
  paymentMethod: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update 'updatedAt' timestamp on save
OrderSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Update 'updatedAt' timestamp on update operations
OrderSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});


const Order = model<IOrder>('Order', OrderSchema);

export default Order;