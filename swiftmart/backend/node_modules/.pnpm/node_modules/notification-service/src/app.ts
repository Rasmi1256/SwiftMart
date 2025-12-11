import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

const app: Express = express();

// Middlewares

// 1. Security Headers
app.use(helmet());

// 2. CORS Configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' ? 'https://your-production-domain.com' : '*',
};
app.use(cors(corsOptions));

// 3. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter as unknown as import('express').RequestHandler);

// 4. Request Logging
app.use(morgan('dev'));

// 5. Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// A simple test route
app.get('/api/v1/inventory/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'UP' });
});

// TODO: Add other service-specific routes here

const PORT = process.env.PORT || 3006; // Assuming 3006 for inventory-service
app.listen(PORT, () => {
  console.log(`Inventory service is running on port ${PORT}`);
});

export default app;