"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const productController_1 = require("../controllers/productController");
const router = (0, express_1.Router)();
// Public routes for products
router.get('/', productController_1.getProducts);
router.get('/:identifier', productController_1.getProductByIdentifier);
// Admin routes for products (would add 'protect' and 'authorize' middleware here)
router.post('/', productController_1.createProduct);
router.put('/:id', productController_1.updateProduct);
router.delete('/:id', productController_1.deleteProduct);
exports.default = router;
