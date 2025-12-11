import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3007, // Assuming 3006 for inventory-service
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  orderServiceUrl: process.env.ORDER_SERVICE_URL,
  userServiceUrl: process.env.USER_SERVICE_URL,
};
