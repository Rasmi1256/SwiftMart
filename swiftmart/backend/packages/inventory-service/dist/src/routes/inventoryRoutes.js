"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const inventoryController_1 = require("../controllers/inventoryController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
// Public routes
router.get('/items', inventoryController_1.getInventoryItems);
router.get('/items/:id', inventoryController_1.getInventoryItem);
router.get('/items/:id/movements', inventoryController_1.getStockMovements);
// Admin-only routes (require authentication)
router.post('/admin/items', authMiddleware_1.authenticate, inventoryController_1.createInventoryItem);
router.put('/admin/items/:id', authMiddleware_1.authenticate, inventoryController_1.updateInventoryItem);
router.post('/admin/items/:id/adjust', authMiddleware_1.authenticate, inventoryController_1.adjustStock);
router.get('/alerts/low-stock', authMiddleware_1.authenticate, inventoryController_1.getLowStockAlerts);
exports.default = router;
