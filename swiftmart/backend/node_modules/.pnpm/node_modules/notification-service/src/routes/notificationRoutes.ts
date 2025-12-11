import { Router } from 'express';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  sendNotification,
  getInAppNotifications,
  markNotificationAsRead,
} from '../controllers/notificationController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// User-specific notification preferences
router.get('/preferences', protect, getNotificationPreferences);
router.put('/preferences', protect, updateNotificationPreferences);

// User-specific in-app notifications
router.get('/in-app', protect, getInAppNotifications);
router.put('/in-app/:notificationId/read', protect, markNotificationAsRead);

// Internal endpoint for other services to send notifications
// In production, this would require strict internal authentication/authorization
router.post('/send', sendNotification); // No 'protect' middleware here for flexibility in MVP testing

export default router;