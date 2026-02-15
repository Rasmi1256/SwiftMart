import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import heatmapRoutes from './routes/heatmapRoutes';

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/heatmap', heatmapRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'heatmap-service' });
});

export default app;
