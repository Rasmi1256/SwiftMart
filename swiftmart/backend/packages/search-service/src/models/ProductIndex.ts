import mongoose, { Schema, Document } from 'mongoose';

export interface IProductIndex extends Document {
  productId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  tags: string[];
  imageUrl: string;
  availableStock: number;
  isAvailable: boolean;
  score: number;
}

const ProductIndexSchema: Schema = new Schema({
  productId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  price: { type: Number, required: true },
  tags: [{ type: String }],
  imageUrl: { type: String },
  availableStock: { type: Number, required: true, default: 0 },
  isAvailable: { type: Boolean, required: true, default: false },
  score: { type: Number, required: true, default: 1 },
}, {
  timestamps: true,
});

// Create text index for full-text search
ProductIndexSchema.index({ name: 'text', description: 'text', tags: 'text' });

const ProductIndex = mongoose.model<IProductIndex>('ProductIndex', ProductIndexSchema);

export default ProductIndex;
