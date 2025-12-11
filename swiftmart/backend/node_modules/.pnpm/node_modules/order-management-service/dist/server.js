"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = require("./config");
const db_1 = __importDefault(require("./db"));
const startServer = async () => {
    try {
        await db_1.default.$connect();
        console.log('Database connection established successfully.');
        app_1.default.listen(config_1.config.port, () => {
            console.log(`User Service running on port ${config_1.config.port}`);
            console.log(`Access at http://localhost:${config_1.config.port}/api/categories`);
            console.log(`Access at http://localhost:${config_1.config.port}/api/products`); // Added line for product catalog access
        });
    }
    catch (error) {
        console.error('Failed to connect to the database:', error);
        process.exit(1);
    }
};
startServer();
