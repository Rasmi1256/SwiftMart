import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3006, // Assuming 3006 for inventory-service
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3001',
  productCatalogServiceUrl: process.env.PRODUCT_CATALOG_SERVICE_URL || 'http://localhost:3002',
  inventoryServiceUrl: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3003',
  promotionsServiceUrl: process.env.PROMOTIONS_SERVICE_URL || 'http://localhost:3004',
  logisticsServiceUrl: process.env.LOGISTICS_SERVICE_URL || 'http://localhost:3005',
};
