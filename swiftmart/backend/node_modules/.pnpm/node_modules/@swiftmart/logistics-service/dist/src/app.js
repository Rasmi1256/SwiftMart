"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const morgan_1 = __importDefault(require("morgan"));
const app = (0, express_1.default)();
// Middlewares
// 1. Security Headers
app.use((0, helmet_1.default)());
// 2. CORS Configuration
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' ? 'https://your-production-domain.com' : '*',
};
app.use((0, cors_1.default)(corsOptions));
// 3. Rate Limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);
// 4. Request Logging
app.use((0, morgan_1.default)('dev'));
// 5. Body Parsing
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// A simple test route
app.get('/api/v1/payments/health', (req, res) => {
    res.status(200).json({ status: 'UP' });
});
// TODO: Add other service-specific routes here
const PORT = process.env.PORT || 3004; // Assuming 3004 for payment-service
exports.default = app;
