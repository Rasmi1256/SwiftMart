"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const categoryController_1 = require("../controllers/categoryController");
const router = (0, express_1.Router)();
// Public routes for categories
router.get('/', categoryController_1.getCategories);
router.get('/:identifier', categoryController_1.getCategoryByIdentifier);
// Admin routes for categories (would add 'protect' and 'authorize' middleware here)
router.post('/', categoryController_1.createCategory);
router.put('/:id', categoryController_1.updateCategory);
router.delete('/:id', categoryController_1.deleteCategory);
exports.default = router;
