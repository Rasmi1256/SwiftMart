"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/logistics-service/src/routes/logisticsRoutes.ts
const express_1 = require("express");
const logisticsController_1 = require("../controllers/logisticsController");
const authMiddleware_1 = require("../middlewares/authMiddleware"); // Assumed auth middleware
const router = (0, express_1.Router)();
// Internal/Admin Routes
router.post('/admin/drivers', authMiddleware_1.protect, authMiddleware_1.admin, logisticsController_1.createDriver);
router.post('/internal/assign', logisticsController_1.assignOrder); // NOTE: Should be protected by API Key/IP Whitelisting
// Driver Routes (requires driver role)
router.put('/driver/pickup', authMiddleware_1.protect, authMiddleware_1.driver, logisticsController_1.pickupOrder);
router.put('/driver/deliver', authMiddleware_1.protect, authMiddleware_1.driver, logisticsController_1.deliverOrder);
router.put('/driver/location', authMiddleware_1.protect, authMiddleware_1.driver, logisticsController_1.updateDriverLocation);
exports.default = router;
