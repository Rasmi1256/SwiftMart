"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.config = {
    port: process.env.PORT || 3005, // Assuming 3005 for delivery-service
    databaseUrl: process.env.DATABASE_URL,
    orderServiceUrl: process.env.ORDER_SERVICE_URL || 'http://localhost:3002',
    jwtSecret: process.env.JWT_SECRET,
};
