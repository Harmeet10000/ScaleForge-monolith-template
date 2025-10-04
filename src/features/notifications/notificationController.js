import asyncHandler from 'express-async-handler';
import { httpResponse } from '../../utils/httpResponse.js';
import { httpError } from '../../utils/httpError.js';
import * as notificationService from './notificationService.js';
import { NOTIFICATION_MESSAGES } from './notificationConstants.js';
import {
  broadcastNotificationSchema,
  bulkNotificationSchema,
  createTopicSchema,
  getHistorySchema,
  registerDeviceSchema,
  scheduleNotificationSchema,
  sendNotificationSchema,
  topicSubscribersSchema,
  triggerToTopicSchema,
  updatePreferencesSchema
} from './notificationValidation.js';
import { validateJoiSchema } from '../../helpers/generalHelper.js';

/**
 * Send a single notification
 * @route POST /api/v1/notifications/send
 */
export const sendNotification = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(sendNotificationSchema, req.body);

  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await notificationService.sendNotification(value, req, next);

  httpResponse(req, res, 200, NOTIFICATION_MESSAGES.NOTIFICATION_SENT_SUCCESS, result);
});

/**
 * Send bulk notifications
 * @route POST /api/v1/notifications/bulk
 */
export const sendBulkNotifications = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(bulkNotificationSchema, req.body);

  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await notificationService.sendBulkNotifications(value.notifications, req, next);

  httpResponse(req, res, 200, NOTIFICATION_MESSAGES.BULK_NOTIFICATIONS_SENT_SUCCESS, result);
});

/**
 * Broadcast notification to all subscribers
 * @route POST /api/v1/notifications/broadcast
 */
export const sendBroadcast = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(broadcastNotificationSchema, req.body);

  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await notificationService.sendBroadcast(value, req, next);

  httpResponse(req, res, 200, NOTIFICATION_MESSAGES.BROADCAST_SENT_SUCCESS, result);
});

/**
 * Update user notification preferences
 * @route PUT /api/v1/notifications/preferences/:userId
 */
export const updatePreferences = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(updatePreferencesSchema, req.body);

  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await notificationService.updatePreferences(req.params.userId, value, req, next);

  httpResponse(req, res, 200, NOTIFICATION_MESSAGES.PREFERENCES_UPDATED_SUCCESS, result);
});

/**
 * Get user notification preferences
 * @route GET /api/v1/notifications/preferences/:userId
 */
export const getPreferences = asyncHandler(async (req, res, next) => {
  const result = await notificationService.getPreferences(req.params.userId, req, next);

  httpResponse(req, res, 200, NOTIFICATION_MESSAGES.PREFERENCES_RETRIEVED_SUCCESS, result);
});
/**
 * Register a device for push notifications
 * @route POST /api/v1/notifications/devices/:userId
 */
export const registerDevice = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(registerDeviceSchema, req.body);

  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await notificationService.registerDevice(req.params.userId, value, req, next);

  httpResponse(req, res, 201, NOTIFICATION_MESSAGES.DEVICE_REGISTERED_SUCCESS, result);
});

/**
 * Unregister a device
 * @route DELETE /api/v1/notifications/devices/:userId/:deviceId
 */
export const unregisterDevice = asyncHandler(async (req, res, next) => {
  const result = await notificationService.unregisterDevice(
    req.params.userId,
    req.params.deviceId,
    req,
    next
  );

  httpResponse(req, res, 200, NOTIFICATION_MESSAGES.DEVICE_UNREGISTERED_SUCCESS, result);
});
/**
 * Get notification history for a user
 * @route GET /api/v1/notifications/history/:userId
 */
export const getNotificationHistory = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(getHistorySchema, req.query);

  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await notificationService.getNotificationHistory(
    req.params.userId,
    value,
    req,
    next
  );

  httpResponse(req, res, 200, NOTIFICATION_MESSAGES.HISTORY_RETRIEVED_SUCCESS, result);
});

export const scheduleNotification = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(scheduleNotificationSchema, req.body);

  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await notificationService.scheduleNotification(value, req, next);

  httpResponse(req, res, 200, NOTIFICATION_MESSAGES.NOTIFICATION_SCHEDULED_SUCCESS, result);
});

export const cancelScheduledNotification = asyncHandler(async (req, res, next) => {
  const result = await notificationService.cancelScheduledNotification(
    req.params.transactionId,
    req,
    next
  );

  httpResponse(req, res, 200, 'Scheduled notification cancelled successfully', result);
});

export const createTopic = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(createTopicSchema, req.body);

  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await notificationService.createNotificationTopic(value, req, next);

  httpResponse(req, res, 201, 'Topic created successfully', result);
});

export const addSubscribersToTopic = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(topicSubscribersSchema, req.body);

  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await notificationService.addSubscribersToTopic(
    req.params.topicKey,
    value.subscriberIds,
    req,
    next
  );

  httpResponse(req, res, 200, 'Subscribers added to topic successfully', result);
});

export const removeSubscribersFromTopic = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(topicSubscribersSchema, req.body);

  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await notificationService.removeSubscribersFromTopic(
    req.params.topicKey,
    value.subscriberIds,
    req,
    next
  );

  httpResponse(req, res, 200, 'Subscribers removed from topic successfully', result);
});

export const triggerToTopic = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(triggerToTopicSchema, req.body);

  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await notificationService.triggerNotificationToTopic(
    value.workflowName,
    req.params.topicKey,
    value.payload,
    req,
    next
  );

  httpResponse(req, res, 200, NOTIFICATION_MESSAGES.NOTIFICATION_SENT_SUCCESS, result);
});

export const getUnseenCount = asyncHandler(async (req, res, next) => {
  const result = await notificationService.getUnseenNotificationCount(req.params.userId, req, next);

  httpResponse(req, res, 200, 'Unseen count retrieved successfully', result);
});

export const markAsRead = asyncHandler(async (req, res, next) => {
  const result = await notificationService.markNotificationAsRead(
    req.params.userId,
    req.params.messageId,
    req,
    next
  );

  httpResponse(req, res, 200, 'Notification marked as read', result);
});

export const markAsSeen = asyncHandler(async (req, res, next) => {
  const result = await notificationService.markNotificationAsSeen(
    req.params.userId,
    req.params.messageId,
    req,
    next
  );

  httpResponse(req, res, 200, 'Notification marked as seen', result);
});

export const markAllAsRead = asyncHandler(async (req, res, next) => {
  const result = await notificationService.markAllNotificationsAsRead(req.params.userId, req, next);

  httpResponse(req, res, 200, 'All notifications marked as read', result);
});

export const deleteNotification = asyncHandler(async (req, res, next) => {
  const result = await notificationService.deleteNotification(
    req.params.userId,
    req.params.messageId,
    req,
    next
  );

  httpResponse(req, res, 200, 'Notification deleted successfully', result);
});
