"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const protect = async (req, res, next) => {
    var _a;
    const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token.' });
    }
    try {
        // Ensure jwtSecret is defined.
        if (!config_1.config.jwtSecret) {
            console.error('JWT Secret is not defined in configuration.');
            return res.status(500).json({ message: 'Server configuration error: JWT secret missing.' });
        }
        // Verify the token and cast it to our custom payload interface.
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        req.user = decoded; // Assign the full decoded payload
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(401).json({ message: 'Not authorized, token expired.' });
        }
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(401).json({ message: 'Not authorized, token failed or invalid.' });
        }
        res.status(500).json({ message: 'Server error during authentication.' });
    }
};
exports.protect = protect;
