import express from 'express';
import couponRoutes from './routes/couponRoutes';

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// API routes
app.use('/api', couponRoutes);

// Basic error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke in Promotions Service!');
});

export default app;
