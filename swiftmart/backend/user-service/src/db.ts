import mongoose from 'mongoose';
import { config } from './config';

export const connectDb = async () => {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('Connected to MongoDB database for User Service');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1); // Exit process if database connection fails
  }
};