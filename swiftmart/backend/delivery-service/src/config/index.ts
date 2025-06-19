import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  port: number;
  mongodbUri: string;
  jwtSecret: string;
  jwtExpiresIn: string | number;
  userServiceUrl: string;
  orderManagementServiceUrl: string;
}

export const config: AppConfig = {
  port: Number(process.env.PORT) || 3004,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/swiftmart_delivery',
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_for_dev_delivery_only',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  userServiceUrl: process.env.USER_SERVICE_URL || 'http://localhost:3001/api',
  orderManagementServiceUrl: process.env.ORDER_MANAGEMENT_SERVICE_URL || 'http://localhost:3003/api',
};


if (!config.mongodbUri || !config.jwtSecret || !config.userServiceUrl || !config.orderManagementServiceUrl) {
  console.error('FATAL ERROR: MONGODB_URI, JWT_SECRET, USER_SERVICE_URL, and ORDER_MANAGEMENT_SERVICE_URL must be defined.');
  process.exit(1);
}

console.log('Delivery Service Configuration Loaded:', {
  port: config.port,
  mongodbUri: config.mongodbUri.split('@')[1] || config.mongodbUri,
  jwtExpiresIn: config.jwtExpiresIn,
  userServiceUrl: config.userServiceUrl,
  orderManagementServiceUrl: config.orderManagementServiceUrl,
});