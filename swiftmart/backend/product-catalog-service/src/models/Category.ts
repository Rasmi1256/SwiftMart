import { Schema, model, Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  description?: string;
  imageUrl?: string;
  slug: string; // For friendly URLs
  parentCategory?: Schema.Types.ObjectId; // For nested categories
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>({
  name: { type: String, required: true, unique: true, trim: true },
  description: { type: String, trim: true },
  imageUrl: { type: String },
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  parentCategory: { type: Schema.Types.ObjectId, ref: 'Category' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update 'updatedAt' timestamp on save
CategorySchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const Category = model<ICategory>('Category', CategorySchema);

export default Category;