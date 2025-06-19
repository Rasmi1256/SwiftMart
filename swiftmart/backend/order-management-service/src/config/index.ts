import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3003,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/swiftmart_orders', // Changed to mongodbUri
  jwtSecret: process.env.JWT_SECRET || 'fallback_secret_for_dev_only', // IMPORTANT: Must match user-service secret
  productCatalogServiceUrl: process.env.PRODUCT_CATALOG_SERVICE_URL || 'http://localhost:3002/api',
};

// Basic validation
if (!config.mongodbUri || !config.jwtSecret || !config.productCatalogServiceUrl) { // Updated validation
  console.error('FATAL ERROR: MONGODB_URI, JWT_SECRET, and PRODUCT_CATALOG_SERVICE_URL must be defined.');
  process.exit(1);
}

console.log('Order Management Service Configuration Loaded:', {
  port: config.port,
  mongodbUri: config.mongodbUri.split('@')[1] || config.mongodbUri, // Mask credentials for logging
  productCatalogServiceUrl: config.productCatalogServiceUrl,
});