import { Schema, model, Document } from 'mongoose';

export interface IOrderItem extends Document {
  orderId: Schema.Types.ObjectId; // Reference to the Order model
  productId: string; // Storing as string as it's from Product Catalog Service (MongoDB ObjectId as string)
  productName: string;
  productImageUrl?: string;
  unitPrice: number;
  quantity: number;
  createdAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  orderId: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
  },
  productId: {
    type: String, // Store as string
    required: true,
    trim: true,
  },
  productName: {
    type: String,
    required: true,
    trim: true,
  },
  productImageUrl: {
    type: String,
    trim: true,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const OrderItem = model<IOrderItem>('OrderItem', OrderItemSchema);

export default OrderItem;