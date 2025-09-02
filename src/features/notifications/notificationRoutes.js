import express from 'express';
import {
  sendNotification,
  sendBroadcast,
  sendBulkNotifications,
  updatePreferences,
  getPreferences,
  registerDevice,
  unregisterDevice,
  getNotificationHistory
} from './notificationController.js';
import { protect } from '../auth/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Multi-channel notification system using Novu for SMS, email, web push, mobile push, and in-app notifications
 */

// Core Notification Routes
router.use(protect);
/**
 * @swagger
 * /notifications/send:
 *   post:
 *     summary: Send a single notification
 *     description: Send a notification to a user through Novu workflows across multiple channels (SMS, email, web push, mobile push, in-app)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationPayload'
 *           example:
 *             userId: "user_123456789"
 *             workflowId: "welcome-email"
 *             payload:
 *               userName: "John Doe"
 *               verificationUrl: "https://example.com/verify?token=abc123"
 *               companyName: "Acme Corp"
 *             channels: ["email", "web_push"]
 *             priority: "high"
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationSuccess'
 *             example:
 *               success: true
 *               statusCode: 200
 *               message: "Notification sent successfully"
 *               data:
 *                 transactionId: "novu_txn_123456789"
 *                 status: "sent"
 *                 channels: ["email", "web_push"]
 *                 deliveryStatus:
 *                   email: "sent"
 *                   web_push: "sent"
 *       400:
 *         description: Bad request - Invalid notification data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationError'
 *             example:
 *               success: false
 *               statusCode: 400
 *               message: "Invalid workflow ID provided"
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationError'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationError'
 *             example:
 *               success: false
 *               statusCode: 422
 *               message: "Validation error"
 *               error:
 *                 details: "userId is required"
 *       503:
 *         description: Service unavailable - Novu service is down
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationError'
 */
router.post('/send', sendNotification);

/**
 * @swagger
 * /notifications/broadcast:
 *   post:
 *     summary: Broadcast a notification to all subscribers
 *     description: Send a notification to all subscribers or subscribers within a specific tenant using Novu broadcast functionality
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - workflowId
 *               - payload
 *             properties:
 *               workflowId:
 *                 type: string
 *                 description: Novu workflow identifier to broadcast
 *                 example: "system-maintenance"
 *               payload:
 *                 type: object
 *                 description: Dynamic payload data for the workflow
 *                 example:
 *                   customKey: "customValue"
 *                   customKey1:
 *                     nestedkey1: "nestedValue1"
 *                   maintenanceTime: "2024-02-01T02:00:00Z"
 *                   duration: "2 hours"
 *               overrides:
 *                 type: object
 *                 description: Channel-specific overrides for the broadcast
 *                 example:
 *                   email:
 *                     from: "support@novu.co"
 *                   sms:
 *                     from: "+1234567890"
 *               tenant:
 *                 type: string
 *                 description: Optional tenant identifier to limit broadcast scope
 *                 example: "tenantIdentifier"
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, critical]
 *                 default: normal
 *                 description: Broadcast priority level
 *                 example: "high"
 *           example:
 *             workflowId: "system-maintenance"
 *             payload:
 *               customKey: "customValue"
 *               customKey1:
 *                 nestedkey1: "nestedValue1"
 *               maintenanceTime: "2024-02-01T02:00:00Z"
 *               duration: "2 hours"
 *             overrides:
 *               email:
 *                 from: "support@novu.co"
 *             tenant: "tenantIdentifier"
 *             priority: "high"
 *     responses:
 *       200:
 *         description: Broadcast sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Broadcast sent successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactionId:
 *                       type: string
 *                       description: Novu transaction ID for tracking
 *                       example: "novu_broadcast_123456789"
 *                     status:
 *                       type: string
 *                       example: "sent"
 *                     workflowId:
 *                       type: string
 *                       example: "system-maintenance"
 *                     tenant:
 *                       type: string
 *                       example: "tenantIdentifier"
 *       400:
 *         description: Bad request - Invalid broadcast data
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Insufficient permissions for broadcast
 *       422:
 *         description: Validation error
 *       503:
 *         description: Service unavailable - Novu service is down
 */
router.post('/broadcast', sendBroadcast);

/**
 * @swagger
 * /notifications/bulk:
 *   post:
 *     summary: Send bulk notifications
 *     description: Send multiple notifications efficiently with batch processing and individual tracking
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notifications
 *             properties:
 *               notifications:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/NotificationPayload'
 *                 minItems: 1
 *                 maxItems: 100
 *                 description: Array of notifications to send (max 100)
 *           example:
 *             notifications:
 *               - userId: "user_123"
 *                 workflowId: "welcome-email"
 *                 payload:
 *                   userName: "John Doe"
 *                   verificationUrl: "https://example.com/verify?token=abc123"
 *                 priority: "normal"
 *               - userId: "user_456"
 *                 workflowId: "welcome-email"
 *                 payload:
 *                   userName: "Jane Smith"
 *                   verificationUrl: "https://example.com/verify?token=def456"
 *                 priority: "normal"
 *     responses:
 *       200:
 *         description: Bulk notifications processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Bulk notifications sent successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     processedCount:
 *                       type: integer
 *                       example: 2
 *                     successCount:
 *                       type: integer
 *                       example: 2
 *                     failureCount:
 *                       type: integer
 *                       example: 0
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                           transactionId:
 *                             type: string
 *                           status:
 *                             type: string
 *                           error:
 *                             type: string
 *       400:
 *         description: Bad request - Invalid bulk notification data
 *       401:
 *         description: Unauthorized - Authentication required
 *       422:
 *         description: Validation error
 *       503:
 *         description: Service unavailable - Novu service is down
 */
router.post('/bulk', sendBulkNotifications);

// Notification History Routes

/**
 * @swagger
 * /notifications/history/{userId}:
 *   get:
 *     summary: Get notification history for a user
 *     description: Retrieve paginated notification history with filtering options for status, channel, and date range
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to get notification history for
 *         example: "user_123456789"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of notifications per page
 *         example: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, sent, delivered, failed, read]
 *         description: Filter by notification status
 *         example: "delivered"
 *       - in: query
 *         name: channel
 *         schema:
 *           type: string
 *           enum: [sms, email, web_push, mobile_push, in_app]
 *         description: Filter by notification channel
 *         example: "email"
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for date range filter (ISO 8601)
 *         example: "2024-01-01"
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for date range filter (ISO 8601)
 *         example: "2024-01-31"
 *     responses:
 *       200:
 *         description: Notification history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Notification history retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     notifications:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           transactionId:
 *                             type: string
 *                             example: "novu_txn_123456789"
 *                           workflowId:
 *                             type: string
 *                             example: "welcome-email"
 *                           channels:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 type:
 *                                   type: string
 *                                   example: "email"
 *                                 status:
 *                                   type: string
 *                                   example: "delivered"
 *                                 sentAt:
 *                                   type: string
 *                                   format: date-time
 *                                 deliveredAt:
 *                                   type: string
 *                                   format: date-time
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           metadata:
 *                             type: object
 *                             properties:
 *                               priority:
 *                                 type: string
 *                               source:
 *                                 type: string
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                           example: 1
 *                         totalPages:
 *                           type: integer
 *                           example: 5
 *                         totalCount:
 *                           type: integer
 *                           example: 95
 *                         hasNextPage:
 *                           type: boolean
 *                           example: true
 *                         hasPrevPage:
 *                           type: boolean
 *                           example: false
 *       400:
 *         description: Bad request - Invalid query parameters
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Cannot access other user's history
 *       404:
 *         description: User not found
 *       422:
 *         description: Validation error
 */
router.get('/history/:userId', getNotificationHistory);

// Preference Management Routes

/**
 * @swagger
 * /notifications/preferences/{userId}:
 *   get:
 *     summary: Get user notification preferences
 *     description: Retrieve current notification preferences for all channels and global settings
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to get preferences for
 *         example: "user_123456789"
 *     responses:
 *       200:
 *         description: Notification preferences retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Notification preferences retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/NotificationPreferences'
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Cannot access other user's preferences
 *       404:
 *         description: User not found or preferences not set
 */
router.get('/preferences/:userId', getPreferences);

/**
 * @swagger
 * /notifications/preferences/{userId}:
 *   put:
 *     summary: Update user notification preferences
 *     description: Update notification preferences for channels and global settings, synchronizes with Novu
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to update preferences for
 *         example: "user_123456789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationPreferences'
 *           example:
 *             channels:
 *               sms:
 *                 enabled: true
 *                 workflows: ["order-updates", "security-alerts"]
 *               email:
 *                 enabled: true
 *                 workflows: ["welcome-email", "newsletter", "order-updates"]
 *               web_push:
 *                 enabled: false
 *                 workflows: []
 *               mobile_push:
 *                 enabled: true
 *                 workflows: ["breaking-news", "order-updates"]
 *               in_app:
 *                 enabled: true
 *                 workflows: ["system-alerts", "messages"]
 *             globalSettings:
 *               doNotDisturb:
 *                 enabled: true
 *                 startTime: "22:00"
 *                 endTime: "08:00"
 *               timezone: "America/New_York"
 *     responses:
 *       200:
 *         description: Notification preferences updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Notification preferences updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/NotificationPreferences'
 *       400:
 *         description: Bad request - Invalid preference data
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Cannot update other user's preferences
 *       404:
 *         description: User not found
 *       422:
 *         description: Validation error
 *       503:
 *         description: Service unavailable - Failed to sync with Novu
 */
router.put('/preferences/:userId', updatePreferences);

// Device Management Routes

/**
 * @swagger
 * /notifications/devices/{userId}:
 *   post:
 *     summary: Register a device for push notifications
 *     description: Register a device token for web, iOS, or Android push notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to register device for
 *         example: "user_123456789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeviceRegistration'
 *           examples:
 *             webDevice:
 *               summary: Web push device
 *               value:
 *                 deviceId: "web_device_123"
 *                 deviceType: "web"
 *                 token: "fcm_token_xyz789"
 *                 endpoint: "https://fcm.googleapis.com/fcm/send/..."
 *                 keys:
 *                   p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8nq4HLRxf9b3P-VgVvSrlFtMnkrn4"
 *                   auth: "tBHItJI5svbpez7KI4CCXg"
 *                 userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
 *             mobileDevice:
 *               summary: Mobile push device
 *               value:
 *                 deviceId: "mobile_device_456"
 *                 deviceType: "ios"
 *                 token: "apns_token_abc123"
 *                 userAgent: "MyApp/1.0 (iPhone; iOS 15.0)"
 *     responses:
 *       201:
 *         description: Device registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: "Device registered successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     deviceId:
 *                       type: string
 *                       example: "web_device_123"
 *                     deviceType:
 *                       type: string
 *                       example: "web"
 *                     isActive:
 *                       type: boolean
 *                       example: true
 *                     registeredAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request - Invalid device data
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Cannot register device for other user
 *       409:
 *         description: Conflict - Device already registered
 *       422:
 *         description: Validation error
 */
router.post('/devices/:userId', registerDevice);

/**
 * @swagger
 * /notifications/devices/{userId}/{deviceId}:
 *   delete:
 *     summary: Unregister a device
 *     description: Remove a device registration and stop push notifications to that device
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID that owns the device
 *         example: "user_123456789"
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID to unregister
 *         example: "web_device_123"
 *     responses:
 *       200:
 *         description: Device unregistered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Device unregistered successfully"
 *       400:
 *         description: Bad request - Invalid device ID
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Cannot unregister other user's device
 *       404:
 *         description: Device not found
 */
router.delete('/devices/:userId/:deviceId', unregisterDevice);

/**
 * @swagger
 * components:
 *   schemas:
 *     NotificationPayload:
 *       type: object
 *       required:
 *         - userId
 *         - workflowId
 *         - payload
 *       properties:
 *         userId:
 *           type: string
 *           description: User ID to send notification to
 *           example: "user_123456789"
 *         workflowId:
 *           type: string
 *           description: Novu workflow identifier
 *           example: "welcome-email"
 *         payload:
 *           type: object
 *           description: Dynamic payload data for the workflow
 *           example:
 *             userName: "John Doe"
 *             verificationUrl: "https://example.com/verify?token=abc123"
 *             companyName: "Acme Corp"
 *         channels:
 *           type: array
 *           items:
 *             type: string
 *             enum: [sms, email, web_push, mobile_push, in_app]
 *           description: Specific channels to send notification through
 *           example: ["email", "web_push"]
 *         priority:
 *           type: string
 *           enum: [low, normal, high, critical]
 *           default: normal
 *           description: Notification priority level
 *           example: "high"
 *     NotificationSuccess:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         statusCode:
 *           type: integer
 *           example: 200
 *         message:
 *           type: string
 *           example: "Notification sent successfully"
 *         data:
 *           type: object
 *           properties:
 *             transactionId:
 *               type: string
 *               description: Novu transaction ID for tracking
 *               example: "novu_txn_123456789"
 *             status:
 *               type: string
 *               example: "sent"
 *             channels:
 *               type: array
 *               items:
 *                 type: string
 *               example: ["email", "web_push"]
 *             deliveryStatus:
 *               type: object
 *               additionalProperties:
 *                 type: string
 *               example:
 *                 email: "sent"
 *                 web_push: "sent"
 *     NotificationError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         statusCode:
 *           type: integer
 *           example: 400
 *         message:
 *           type: string
 *           example: "Invalid workflow ID provided"
 *         error:
 *           type: object
 *           properties:
 *             details:
 *               type: string
 *               example: "userId is required"
 *     NotificationPreferences:
 *       type: object
 *       properties:
 *         channels:
 *           type: object
 *           properties:
 *             sms:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *                   example: true
 *                 workflows:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["order-updates", "security-alerts"]
 *             email:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *                   example: true
 *                 workflows:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["welcome-email", "newsletter", "order-updates"]
 *             web_push:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *                   example: false
 *                 workflows:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: []
 *             mobile_push:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *                   example: true
 *                 workflows:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["breaking-news", "order-updates"]
 *             in_app:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *                   example: true
 *                 workflows:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["system-alerts", "messages"]
 *         globalSettings:
 *           type: object
 *           properties:
 *             doNotDisturb:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *                   example: true
 *                 startTime:
 *                   type: string
 *                   pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                   example: "22:00"
 *                 endTime:
 *                   type: string
 *                   pattern: '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
 *                   example: "08:00"
 *             timezone:
 *               type: string
 *               example: "America/New_York"
 *     DeviceRegistration:
 *       type: object
 *       required:
 *         - deviceId
 *         - deviceType
 *         - token
 *       properties:
 *         deviceId:
 *           type: string
 *           description: Unique device identifier
 *           example: "web_device_123"
 *         deviceType:
 *           type: string
 *           enum: [web, ios, android]
 *           description: Type of device for push notifications
 *           example: "web"
 *         token:
 *           type: string
 *           description: Push notification token (FCM, APNS, etc.)
 *           example: "fcm_token_xyz789"
 *         endpoint:
 *           type: string
 *           format: uri
 *           description: Web push endpoint URL (required for web devices)
 *           example: "https://fcm.googleapis.com/fcm/send/..."
 *         keys:
 *           type: object
 *           description: Web push encryption keys (required for web devices)
 *           properties:
 *             p256dh:
 *               type: string
 *               description: P256DH key for web push encryption
 *               example: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8nq4HLRxf9b3P-VgVvSrlFtMnkrn4"
 *             auth:
 *               type: string
 *               description: Auth key for web push encryption
 *               example: "tBHItJI5svbpez7KI4CCXg"
 *         userAgent:
 *           type: string
 *           description: Device user agent string
 *           example: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: JWT token obtained from login endpoint
 */

export default router;
