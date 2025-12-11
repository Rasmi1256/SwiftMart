"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notificationController_1 = require("../controllers/notificationController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// User-specific notification preferences
router.get('/preferences', authMiddleware_1.protect, notificationController_1.getNotificationPreferences);
router.put('/preferences', authMiddleware_1.protect, notificationController_1.updateNotificationPreferences);
// User-specific in-app notifications
router.get('/in-app', authMiddleware_1.protect, notificationController_1.getInAppNotifications);
router.put('/in-app/:notificationId/read', authMiddleware_1.protect, notificationController_1.markNotificationAsRead);
// Internal endpoint for other services to send notifications
// In production, this would require strict internal authentication/authorization
router.post('/send', notificationController_1.sendNotification); // No 'protect' middleware here for flexibility in MVP testing
exports.default = router;
