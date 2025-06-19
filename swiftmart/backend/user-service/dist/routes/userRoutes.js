"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const router = (0, express_1.Router)();
// Public routes
router.post('/register', userController_1.registerUser);
router.post('/login', userController_1.loginUser);
// Private routes (protected by JWT middleware)
router.get('/profile', userController_1.getUserProfile);
router.put('/profile', userController_1.updateUserProfile);
router.post('/addresses', userController_1.addAddress);
router.put('/addresses/:id', userController_1.updateAddress);
router.delete('/addresses/:id', userController_1.deleteAddress);
exports.default = router;
