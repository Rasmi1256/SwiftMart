"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const inventoryController_1 = require("../controllers/inventoryController");
const router = (0, express_1.Router)();
// GET /api/inventory?productIds=p1,p2,p3
// Retrieves inventory levels for one or more products.
router.get('/', inventoryController_1.getInventoryLevels);
// PATCH /api/inventory/:productId
// Updates the stock for a specific product (e.g., decrementing after a sale).
router.patch('/:productId', inventoryController_1.updateInventoryStock);
exports.default = router;
