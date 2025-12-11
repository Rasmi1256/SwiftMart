"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const deliveryController_1 = require("../controllers/deliveryController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Admin routes
router.post('/admin/deliveries', authMiddleware_1.authenticate, deliveryController_1.createDelivery);
// Driver routes
router.put('/driver/deliveries/:id/status', authMiddleware_1.authenticate, deliveryController_1.updateDeliveryStatus);
// Internal routes
router.post('/internal/assign', deliveryController_1.assignDriver);
// Public routes
router.get('/deliveries/:id', deliveryController_1.getDelivery);
router.get('/deliveries', deliveryController_1.getDeliveries);
exports.default = router;
