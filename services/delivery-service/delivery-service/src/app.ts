import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import deliveryRoutes from './routes/deliveryRoutes';
import WebSocketManager from './websocket';
import { connectRedis } from './redis';

const app = express();

// Initialize WebSocket manager (will be attached to server in server.ts)
let wsManager: WebSocketManager;

// Security middleware
app.use(helmet());

// CORS middleware
app.use(cors({
  origin: ['http://localhost:3006', 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Connect to Redis on app startup (optional - service can work without it)
connectRedis().catch((error) => {
  console.warn('Redis connection failed, some features may be unavailable:', error.message);
});

// Routes
app.use('/api/delivery', deliveryRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    service: 'delivery-service',
    websocket: wsManager ? 'initialized' : 'not initialized'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Function to initialize WebSocket manager with server
export const initializeWebSocket = (server: any) => {
  wsManager = new WebSocketManager(server);
  console.log('WebSocket manager initialized');
};

export default app;
