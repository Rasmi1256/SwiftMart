import { Schema, model, Document } from 'mongoose';

// Define the interface for the Address document
export interface IAddress extends Document {
  userId: Schema.Types.ObjectId; // Reference to the User model
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
  createdAt: Date;
}

// Define the Address Schema
const AddressSchema = new Schema<IAddress>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User', // Reference to the 'User' model
    required: true,
  },
  addressLine1: {
    type: String,
    required: true,
    trim: true,
  },
  addressLine2: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    required: true,
    trim: true,
  },
  zipCode: {
    type: String,
    required: true,
    trim: true,
  },
  country: {
    type: String,
    default: 'India',
    trim: true,
  },
  latitude: {
    type: Number,
  },
  longitude: {
    type: Number,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient querying by userId and isDefault
AddressSchema.index({ userId: 1, isDefault: 1 });

const Address = model<IAddress>('Address', AddressSchema);

export default Address;