import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

// Define the interface for the User document
export interface IUser extends Document {
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword?(candidatePassword: string): Promise<boolean>;
  // Methods for password comparison could be added here
}

// Define the User Schema
const UserSchema = new Schema<IUser>({
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
    trim: true,
  },
  lastName: {
    type: String,
    trim: true,
  },
  phoneNumber: {
    type: String,
    unique: true,
    sparse: true, // Allows null values to not violate unique constraint
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

// Middleware to hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

// Method to compare password (Mongoose virtual or instance method)
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.passwordHash);
};

// Update 'updatedAt' timestamp on update operations
UserSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

const User = model<IUser>('User', UserSchema);

export default User;