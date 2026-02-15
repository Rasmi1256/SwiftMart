import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors'; // 1. Import CORS
import productRoutes from './routes/productRoutes';
import categoryRoutes from './routes/categoryRoutes';

const app = express();

// 2. Enable CORS (Must be before routes)
// In your backend app.ts
app.use(cors({
  // Change 3000 to 3002 to match your actual frontend port
  origin: ['http://localhost:3006', 'http://localhost:3000', 'http://localhost:3004', 'http://localhost:3002'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware to parse JSON bodies
app.use(express.json());

// API routes
// These are correctly mounted to match your frontend calls
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);

// Basic error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something broke in Product Catalog Service!' });
});

export default app;