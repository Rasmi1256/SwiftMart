"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.driver = exports.admin = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
            req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
            next();
        }
        catch (error) {
            console.error('Auth middleware error:', error);
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                res.status(401).json({ message: 'Not authorized, token failed or invalid.' });
                return;
            }
            res.status(500).json({ message: 'Server error during authentication.' });
        }
    }
    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token.' });
    }
};
exports.protect = protect;
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    }
    else {
        res.status(403).json({ message: 'Not authorized as admin.' });
    }
};
exports.admin = admin;
const driver = (req, res, next) => {
    if (req.user && req.user.role === 'driver') {
        next();
    }
    else {
        res.status(403).json({ message: 'Not authorized as driver.' });
    }
};
exports.driver = driver;
