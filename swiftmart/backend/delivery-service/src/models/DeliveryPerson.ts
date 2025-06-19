import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IDeliveryPerson extends Document {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  vehicleType: 'bike' | 'scooter' | 'car' | 'bicycle';
  licensePlate?: string; // Optional for non-bicycle
  status: 'active' | 'inactive' | 'on-duty' | 'off-duty';
  currentLocation?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  };
  assignedOrders: string[]; // Array of Order IDs (from Order Management Service)
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryPersonSchema = new Schema<IDeliveryPerson>({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  vehicleType: {
    type: String,
    enum: ['bike', 'scooter', 'car', 'bicycle'],
    required: true,
  },
  licensePlate: {
    type: String,
    trim: true,
    sparse: true, // Allows null/undefined values to not violate unique if made unique later
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'on-duty', 'off-duty'],
    default: 'inactive', // Default to inactive until manually activated
    required: true,
  },
  currentLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    timestamp: { type: Date },
  },
  assignedOrders: [{
    type: String, // Store order IDs as strings (from Order Management Service)
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password before saving
DeliveryPersonSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// Method to compare password
DeliveryPersonSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Update 'updatedAt' timestamp on update operations
DeliveryPersonSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

const DeliveryPerson = model<IDeliveryPerson>('DeliveryPerson', DeliveryPersonSchema);

export default DeliveryPerson;