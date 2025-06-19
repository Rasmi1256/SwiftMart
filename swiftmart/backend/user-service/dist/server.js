"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const config_1 = require("./config");
const db_1 = require("./db");
const startServer = async () => {
    await (0, db_1.connectDb)(); // Connect to database and ensure tables exist
    app_1.default.listen(config_1.config.port, () => {
        console.log(`User Service running on port ${config_1.config.port}`);
        console.log(`Access at http://localhost:${config_1.config.port}/api/users`);
    });
};
startServer();
