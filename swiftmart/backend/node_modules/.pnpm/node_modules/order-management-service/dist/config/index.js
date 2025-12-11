"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: process.env.PORT || 3002,
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/swiftmart_products',
    pricingServiceUrl: process.env.PRICING_SERVICE_URL || 'http://localhost:3007/prices',
    inventoryServiceUrl: process.env.INVENTORY_SERVICE_URL || 'http://localhost:3008/api', // New inventory service URL
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
};
// Basic validation
if (!exports.config.mongodbUri) {
    console.error('FATAL ERROR: MONGODB_URI must be defined in environment variables.');
    process.exit(1);
}
console.log('Product Catalog Service Configuration Loaded:', {
    port: exports.config.port,
    mongodbUri: exports.config.mongodbUri.split('@')[1] || exports.config.mongodbUri,
    pricingServiceUrl: exports.config.pricingServiceUrl,
    inventoryServiceUrl: exports.config.inventoryServiceUrl, // Log new inventory service URL
});
