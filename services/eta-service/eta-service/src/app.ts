import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import etaRoutes from './routes/etaRoutes';

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/eta', etaRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'eta-service' });
});

export default app;
