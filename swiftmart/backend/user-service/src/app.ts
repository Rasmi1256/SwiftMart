import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes';

const app = express();

// Apply CORS middleware before other middleware and routes
app.use(cors({
  origin: 'http://localhost:3000', // Allow your frontend origin
  credentials: true, // If you need cookies/auth headers
}));

// Middleware to parse JSON bodies
app.use(express.json());

// API routes
app.use('/api/users', userRoutes);

// Basic error handling middleware (optional, can be more sophisticated)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

export default app;
