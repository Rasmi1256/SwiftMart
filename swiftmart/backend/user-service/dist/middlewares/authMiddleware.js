"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];
            // Verify token
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
            // Attach user information to the request object
            // For simplicity, we're just attaching id and email from the token.
            // In a real app, you might fetch the user from the DB to ensure they still exist and are active.
            req.user = { id: decoded.id, email: decoded.email };
            next();
        }
        catch (error) {
            console.error('Auth middleware error:', error);
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                return res.status(401).json({ message: 'Not authorized, token failed or invalid.' });
            }
            res.status(500).json({ message: 'Server error during authentication.' });
        }
    }
    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token.' });
    }
};
exports.protect = protect;
