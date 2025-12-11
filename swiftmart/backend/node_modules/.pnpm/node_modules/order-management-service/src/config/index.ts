import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3005, // Assuming 3005 for delivery-service
  databaseUrl: process.env.DATABASE_URL,
  orderServiceUrl: process.env.ORDER_SERVICE_URL || 'http://localhost:3002',
  jwtSecret: process.env.JWT_SECRET,
  inventoryServiceUrl: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003',
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3001',
  pricingServiceUrl: process.env.PRICING_SERVICE_URL || 'http://localhost:3006',
  redisUrl: process.env.REDIS_URL
};
