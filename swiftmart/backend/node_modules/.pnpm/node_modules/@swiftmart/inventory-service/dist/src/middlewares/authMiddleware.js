"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const authenticate = (req, res, next) => {
    var _a;
    const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }
    try {
        // Ensure jwtSecret is defined. This addresses TS2769.
        if (!config_1.config.jwtSecret) {
            console.error('JWT Secret is not defined in configuration.');
            return res.status(500).json({ message: 'Server configuration error: JWT secret missing.' });
        }
        // Verify the token and cast it to our custom payload interface.
        // This addresses TS2352 by explicitly telling TypeScript the expected shape.
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        // It's good practice to also check if the required custom fields exist at runtime,
        // although TypeScript will assume they do after the cast.
        if (!decoded.id || !decoded.email) {
            return res.status(400).json({ message: 'Invalid token payload: missing user ID or email.' });
        }
        req.user = decoded; // Assign the decoded payload to req.user
        next();
    }
    catch (error) {
        // More specific error handling for JWT issues
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(401).json({ message: 'Token expired.' });
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(401).json({ message: 'Invalid token.' });
        }
        // Catch-all for other potential errors during verification
        res.status(400).json({ message: 'Token verification failed.' });
    }
};
exports.authenticate = authenticate;
