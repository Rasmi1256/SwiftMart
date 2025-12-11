import { Request, Response } from 'express';
import prisma from '../db';
import axios from 'axios'; // For fetching user details if needed
import { config } from '../config';
import { AuthRequest } from '../middlewares/authMiddleware';

// Helper to get user's email/phone from User Service (for actual sending)
const getUserContactDetails = async (userId: string) => {
  // NOTE: The 'userServiceUrl' property needs to be added to your config object and .env file for this service.
  const userServiceUrl = (config as any).userServiceUrl;

  if (!userServiceUrl) {
    console.error('User Service URL (userServiceUrl) is not configured. Cannot fetch contact details.');
    return { email: undefined, phoneNumber: undefined };
  }
  try {
    const response = await axios.get(`${userServiceUrl}/users/profile/${userId}`); // Assuming user service has this endpoint for internal lookup
    return {
      email: (response.data as { email?: string; phoneNumber?: string }).email,
      phoneNumber: (response.data as { email?: string; phoneNumber?: string }).phoneNumber,
    };
  } catch (error) {
    console.error(`Error fetching user ${userId} contact details:`, (error as any).response?.data || error);
    return { email: undefined, phoneNumber: undefined };
  }
};

// @desc    Get user's notification preferences
// @route   GET /api/notifications/preferences
// @access  Private (User Only)
export const getNotificationPreferences = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, user not found.' });
  }

  try {
    let preferences = await prisma.notificationPreference.findUnique({ where: { userId: req.user.id } });

    if (!preferences) {
      // Create default preferences if none exist
      preferences = await prisma.notificationPreference.create({
        data: {
          userId: req.user.id,
        },
      });
    }

    res.status(200).json({
      message: 'Notification preferences fetched successfully',
      preferences: preferences,
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ message: 'Server error fetching preferences.' });
  }
};

// @desc    Update user's notification preferences
// @route   PUT /api/notifications/preferences
// @access  Private (User Only)
export const updateNotificationPreferences = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, user not found.' });
  }

  const { emailEnabled, smsEnabled, inAppEnabled, pushEnabled, fcmToken } = req.body;

  try {
    const dataToUpdate: { [key: string]: any } = {};
    if (emailEnabled !== undefined) dataToUpdate.emailEnabled = emailEnabled;
    if (smsEnabled !== undefined) dataToUpdate.smsEnabled = smsEnabled;
    if (inAppEnabled !== undefined) dataToUpdate.inAppEnabled = inAppEnabled;
    if (pushEnabled !== undefined) dataToUpdate.pushEnabled = pushEnabled;
    // Allow unsetting the token by passing null
    if (fcmToken !== undefined) dataToUpdate.fcmToken = fcmToken;

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: req.user.id },
      update: dataToUpdate,
      create: {
        userId: req.user.id,
        emailEnabled: emailEnabled ?? true,
        smsEnabled: smsEnabled ?? false,
        inAppEnabled: inAppEnabled ?? true,
        pushEnabled: pushEnabled ?? false,
        fcmToken: fcmToken,
      },
    });

    res.status(200).json({
      message: 'Notification preferences updated successfully',
      preferences: preferences,
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ message: 'Server error updating preferences.' });
  }
};

// @desc    Internal endpoint to send a notification to a user
// @route   POST /api/notifications/send
// @access  Internal (Other Microservices)
export const sendNotification = async (req: Request, res: Response) => {
  // In a production environment, this endpoint would be protected by an API key,
  // internal network firewall, or a specialized inter-service authentication mechanism.
  // For MVP, we'll allow it if authentication is not critical for simple demo.
  // If `protect` middleware is used here, ensure the calling service provides a valid token (e.g., a service-to-service token).

  const { userId, type, message, data } = req.body;

  if (!userId || !type || !message) {
    return res.status(400).json({ message: 'User ID, type, and message are required to send a notification.' });
  }

  try {
    const preferences = await prisma.notificationPreference.findUnique({ where: { userId } });

    if (!preferences) {
      console.warn(`No notification preferences found for user ${userId}. Defaulting to in-app.`);
      // If no preferences, assume in-app is always enabled
      await prisma.inAppNotification.create({
        data: {
          userId,
          type,
          message,
          data: data || {},
        },
      });
      return res.status(200).json({ message: 'Notification sent (in-app default).' });
    }

    const sentChannels: string[] = [];

    // Simulate sending based on preferences
    if (preferences.inAppEnabled) {
      await prisma.inAppNotification.create({
        data: {
          userId,
          type,
          message,
          data: data || {},
        },
      });
      sentChannels.push('in-app');
      console.log(`[Notification Service] In-app notification for user ${userId}: "${message}"`);
    }

    // If contact details aren't stored with preferences, fetch them from the user service.
    const needsEmail = preferences.emailEnabled && !preferences.emailAddress;
    const needsSms = preferences.smsEnabled && !preferences.phoneNumber;
    let contactDetails: { email?: string; phoneNumber?: string } = {};

    if (needsEmail || needsSms) {
      contactDetails = await getUserContactDetails(userId);
    }

    if (preferences.emailEnabled) {
      const email = preferences.emailAddress || contactDetails.email;
      if (email) {
        // In a real app: Call Email Sending Service (e.g., SendGrid, Mailgun)
        console.log(`[Notification Service] Sending email to ${email} for user ${userId}: "${message}"`);
        sentChannels.push('email');
      } else {
        console.warn(`[Notification Service] Email enabled for ${userId} but no email address could be found.`);
      }
    }

    if (preferences.smsEnabled) {
      const phone = preferences.phoneNumber || contactDetails.phoneNumber;
      if (phone) {
        // In a real app: Call SMS Sending Service (e.g., Twilio)
        console.log(`[Notification Service] Sending SMS to ${phone} for user ${userId}: "${message}"`);
        sentChannels.push('sms');
      } else {
        console.warn(`[Notification Service] SMS enabled for ${userId} but no phone number found.`);
      }
    }

    if (preferences.pushEnabled && preferences.fcmToken) {
      // In a real app: Call Push Notification Service (e.g., Firebase Cloud Messaging)
      console.log(`[Notification Service] Sending Push to FCM token ${preferences.fcmToken} for user ${userId}: "${message}"`);
      sentChannels.push('push');
    }

    if (sentChannels.length === 0) {
      return res.status(200).json({ message: 'No enabled channels for this notification.' });
    }

    res.status(200).json({
      message: `Notification sent successfully via channels: ${sentChannels.join(', ')}.`,
      sentChannels,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ message: 'Server error sending notification.' });
  }
};

// @desc    Get user's in-app notifications
// @route   GET /api/notifications/in-app
// @access  Private (User Only)
export const getInAppNotifications = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, user not found.' });
  }

  try {
    const notifications = await prisma.inAppNotification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.status(200).json({
      message: 'In-app notifications fetched successfully',
      notifications,
    });
  } catch (error) {
    console.error('Error fetching in-app notifications:', error);
    res.status(500).json({ message: 'Server error fetching in-app notifications.' });
  }
};

// @desc    Mark in-app notification as read
// @route   PUT /api/notifications/in-app/:notificationId/read
// @access  Private (User Only)
export const markNotificationAsRead = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, user not found.' });
  }

  const { notificationId } = req.params;

  try {
    const { count } = await prisma.inAppNotification.updateMany({
      where: { id: notificationId, userId: req.user.id, read: false },
      data: { read: true },
    });

    if (count === 0) {
      return res.status(404).json({ message: 'Notification not found or already read.' });
    }

    const updatedNotification = await prisma.inAppNotification.findUnique({ where: { id: notificationId } });

    res.status(200).json({ message: 'Notification marked as read', notification: updatedNotification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error marking notification as read.' });
  }
};