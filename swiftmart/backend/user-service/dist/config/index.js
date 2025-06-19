"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Initialize config to avoid type 'undefined' error
exports.config = {};
const dotenv = require("dotenv");
dotenv.config();
exports.config = {
    port: process.env.PORT || 3001,
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/swiftmart_users', // Changed to mongodbUri
    jwtSecret: process.env.JWT_SECRET || 'fallback_secret_for_dev_only', // IMPORTANT: Change for production
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
};
// Basic validation
if (!exports.config.mongodbUri || !exports.config.jwtSecret) { // Updated validation
    console.error('FATAL ERROR: MONGODB_URI and JWT_SECRET must be defined in environment variables.');
    process.exit(1);
}
console.log('User Service Configuration Loaded:', {
    port: exports.config.port,
    mongodbUri: exports.config.mongodbUri.split('@')[1] || exports.config.mongodbUri, // Mask credentials for logging
    jwtExpiresIn: exports.config.jwtExpiresIn,
});
