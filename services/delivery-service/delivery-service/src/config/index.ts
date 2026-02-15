import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3005, // Assuming 3005 for delivery-service
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  orderServiceUrl: process.env.ORDER_SERVICE_URL || 'http://localhost:3002',
  jwtSecret: process.env.JWT_SECRET,
};
