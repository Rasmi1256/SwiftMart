import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 3002,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/swiftmart_products', // Fallback, but prefer .env
};

// Basic validation
if (!config.mongodbUri) {
  console.error('FATAL ERROR: MONGODB_URI must be defined in environment variables.');
  process.exit(1);
}

console.log('Product Catalog Service Configuration Loaded:', {
  port: config.port,
  mongodbUri: config.mongodbUri.split('@')[1] || config.mongodbUri, // Mask credentials for logging
});