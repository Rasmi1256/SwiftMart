import express from 'express';
import orderRoutes from './routes/orderRoutes';

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// API routes
app.use('/api', orderRoutes); // Using /api directly for cart and orders

// Basic error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke in Order Management Service!');
});

export default app;