import { Schema, model, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  unit: string; // e.g., "kg", "piece", "liter"
  category: Schema.Types.ObjectId; // Reference to Category model
  subCategory?: Schema.Types.ObjectId; // Optional sub-category
  brand?: string;
  SKU: string; // Stock Keeping Unit, unique identifier
  imageUrl: string;
  thumbnailUrl?: string;
  nutritionalInfo?: { [key: string]: any }; // Flexible object for nutritional data
  weight?: { value: number; unit: string };
  dimensions?: { length: number; width: number; height: number; unit: string };
  tags?: string[];
  isAvailable: boolean; // Managed by Inventory Service, but stored here for display
  averageRating?: number; // Denormalized from ratings service
  reviewCount?: number; // Denormalized from ratings service
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true, trim: true },
  category: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  subCategory: { type: Schema.Types.ObjectId, ref: 'Category' },
  brand: { type: String, trim: true },
  SKU: { type: String, required: true, unique: true, trim: true },
  imageUrl: { type: String, required: true },
  thumbnailUrl: { type: String },
  nutritionalInfo: { type: Schema.Types.Mixed }, // Use Mixed for flexible object
  weight: {
    value: { type: Number, min: 0 },
    unit: { type: String }
  },
  dimensions: {
    length: { type: Number, min: 0 },
    width: { type: Number, min: 0 },
    height: { type: Number, min: 0 },
    unit: { type: String }
  },
  tags: [{ type: String, trim: true }],
  isAvailable: { type: Boolean, default: true },
  averageRating: { type: Number, min: 0, max: 5, default: 0 },
  reviewCount: { type: Number, min: 0, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Add text index for search functionality
ProductSchema.index({ name: 'text', description: 'text', brand: 'text', tags: 'text' });

// Update 'updatedAt' timestamp on save
ProductSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const Product = model<IProduct>('Product', ProductSchema);

export default Product;