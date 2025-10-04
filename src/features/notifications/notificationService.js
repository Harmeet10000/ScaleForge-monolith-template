import { logger } from '../../utils/logger.js';
import { httpError } from '../../utils/httpError.js';
import * as novuHelper from '../../helpers/novu.js';
import * as notificationRepository from './notificationRepository.js';
import { User } from '../auth/userModel.js';
import { NotificationPreferences } from './notificationPreferencesModel.js';
import asyncHandler from 'express-async-handler';

// ===== CORE NOTIFICATION SENDING FUNCTIONS =====

export const sendNotification = asyncHandler(async (notificationData) => {
  // Get user details for subscriber information
  const user = await User.findById(notificationData.userId).select(
    'email firstName lastName phone novuSubscriberId'
  );

  // Sanitize notification content to prevent sensitive data exposure
  const sanitizedPayload = sanitizeNotificationContent(notificationData.payload);

  // Prepare Novu workflow data
  const workflowData = {
    name: notificationData.workflowId,
    to: {
      subscriberId: user.novuSubscriberId || user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone
    },
    payload: sanitizedPayload,
    overrides: notificationData.channels ? { channels: notificationData.channels } : {}
  };

  // Trigger Novu workflow
  logger.info('Triggering Novu workflow', {
    meta: {
      userId: notificationData.userId,
      workflowId: notificationData.workflowId
    }
  });

  const novuResponse = await novuHelper.triggerWorkflow(workflowData);

  // Prepare channels data for logging
  const channelsData = (
    notificationData.channels || ['email', 'sms', 'web_push', 'mobile_push', 'in_app']
  ).map((channel) => ({
    type: channel,
    status: 'pending',
    sentAt: new Date()
  }));

  // Save notification log for tracking
  const logData = {
    userId: notificationData.userId,
    transactionId: novuResponse.transactionId,
    workflowId: notificationData.workflowId,
    channels: channelsData,
    payload: sanitizedPayload,
    metadata: {
      source: notificationData.metadata?.source || 'api',
      priority: notificationData.priority || 'normal',
      tags: notificationData.metadata?.tags || []
    }
  };

  await notificationRepository.saveNotificationLog(logData);

  logger.info('Notification sent successfully', {
    meta: {
      userId: notificationData.userId,
      workflowId: notificationData.workflowId,
      transactionId: novuResponse.transactionId
    }
  });

  return {
    transactionId: novuResponse.transactionId,
    status: 'sent',
    channels: channelsData.map((c) => c.type),

    sentAt: new Date()
  };
});

export const sendBulkNotifications = asyncHandler(async (notifications, req, next) => {
  if (notifications.length > 100) {
    return httpError(next, new Error('Maximum 100 notifications allowed per batch'), req, 400);
  }

  logger.info('Starting bulk notification processing with native Novu bulk trigger', {
    meta: { count: notifications.length }
  });

  const bulkEvents = await Promise.all(
    notifications.map(async (notification) => {
      const user = await User.findById(notification.userId).select(
        'email firstName lastName phone novuSubscriberId'
      );

      if (!user) {
        return null;
      }

      return {
        name: notification.workflowId,
        to: {
          subscriberId: user.novuSubscriberId || user._id.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone
        },
        payload: sanitizeNotificationContent(notification.payload),
        overrides: notification.channels ? { channels: notification.channels } : {}
      };
    })
  );

  const validEvents = bulkEvents.filter((event) => event !== null);

  const novuResponse = await novuHelper.bulkTriggerEvents(validEvents);

  await Promise.all(
    validEvents.map((event, index) =>
      notificationRepository.saveNotificationLog({
        userId: notifications[index].userId,
        transactionId: novuResponse[index]?.transactionId,
        workflowId: event.name,
        channels: (notifications[index].channels || []).map((type) => ({
          type,
          status: 'pending',
          sentAt: new Date()
        })),
        payload: event.payload,
        metadata: {
          source: 'bulk_api',
          priority: notifications[index].priority || 'normal',
          batchId: req.correlationId
        }
      })
    )
  );

  logger.info('Bulk notification processing completed', {
    meta: {
      total: notifications.length,
      successful: validEvents.length,
      failed: notifications.length - validEvents.length
    }
  });

  return {
    total: notifications.length,
    successful: validEvents.length,
    failed: notifications.length - validEvents.length,
    results: novuResponse
  };
});

export const sendBroadcast = asyncHandler(async (broadcastData, req) => {
  // Sanitize broadcast content to prevent sensitive data exposure
  const sanitizedPayload = sanitizeNotificationContent(broadcastData.payload);

  // Prepare Novu broadcast data
  const novuBroadcastData = {
    name: broadcastData.workflowId,
    payload: sanitizedPayload,
    overrides: broadcastData.overrides || {},
    tenant: broadcastData.tenant
  };

  logger.info('Triggering Novu broadcast', {
    meta: {
      workflowId: broadcastData.workflowId,
      tenant: broadcastData.tenant,
      priority: broadcastData.priority
    }
  });

  // Trigger Novu broadcast
  const novuResponse = await novuHelper.broadcastWorkflow(novuBroadcastData);

  // Log broadcast to database for audit trail
  const broadcastLog = {
    transactionId: novuResponse.transactionId,
    workflowId: broadcastData.workflowId,
    payload: sanitizedPayload,
    overrides: broadcastData.overrides,
    tenant: broadcastData.tenant,
    priority: broadcastData.priority || 'normal',
    status: 'sent',
    sentAt: new Date(),
    metadata: {
      source: 'api',
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip,
      correlationId: req.correlationId
    }
  };

  // Save broadcast log to repository
  await notificationRepository.createBroadcastLog(broadcastLog);

  logger.info('Broadcast sent successfully', {
    meta: {
      transactionId: novuResponse.transactionId,
      workflowId: broadcastData.workflowId,
      tenant: broadcastData.tenant
    }
  });

  return {
    transactionId: novuResponse.transactionId,
    status: 'sent',
    workflowId: broadcastData.workflowId,
    tenant: broadcastData.tenant,
    sentAt: new Date()
  };
});

// ===== UTILITY FUNCTIONS =====

const sanitizeNotificationContent = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  const sanitized = { ...payload };

  // List of sensitive fields to mask or remove
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'key',
    'ssn',
    'creditCard',
    'bankAccount',
    'apiKey',
    'privateKey',
    'accessToken'
  ];

  // Recursively sanitize object
  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const result = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Check if field contains sensitive data
      if (sensitiveFields.some((field) => lowerKey.includes(field))) {
        result[key] = '***MASKED***';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = sanitizeObject(value);
      } else if (typeof value === 'string' && value.length > 100) {
        // Truncate very long strings to prevent payload bloat
        result[key] = `${value.substring(0, 100)}...`;
      } else {
        result[key] = value;
      }
    }

    return result;
  };

  return sanitizeObject(sanitized);
};

// ===== CHANNEL-SPECIFIC NOTIFICATION FUNCTIONS =====

export const sendSMS = asyncHandler(async (userId, messageData, options = {}, req, next) => {
  // Get user and validate phone number
  const user = await User.findById(userId).select('phone firstName lastName novuSubscriberId');
  if (!user) {
    return httpError(next, new Error('User not found'), req, 404);
  }

  if (!user.phone) {
    return httpError(next, new Error('User phone number not available'), req, 400);
  }

  // Validate phone number format (basic validation)
  if (!isValidPhoneNumber(user.phone)) {
    return httpError(next, new Error('Invalid phone number format'), req, 400);
  }

  // Prepare SMS-specific notification data
  const notificationData = {
    userId,
    workflowId: messageData.workflowId,
    payload: {
      message: messageData.message,
      phone: user.phone,
      firstName: user.firstName,
      ...messageData.payload
    },
    channels: ['sms'],
    priority: options.priority || 'normal',
    metadata: {
      source: 'sms_api',
      channel: 'sms',
      ...options.metadata
    }
  };

  logger.info('Sending SMS notification', {
    meta: {
      userId,
      phone: maskPhoneNumber(user.phone),
      workflowId: messageData.workflowId
    }
  });

  return await sendNotification(notificationData, req, next);
});

export const sendWebPush = asyncHandler(async (userId, messageData, options = {}, req, next) => {
  // Get user's web push devices
  const webDevices = await notificationRepository.getDevicesByType(userId, 'web', true);

  if (webDevices.length === 0) {
    return httpError(next, new Error('No active web push devices found for user'), req, 404);
  }

  // Prepare web push notification data
  const notificationData = {
    userId,
    workflowId: messageData.workflowId,
    payload: {
      title: messageData.title,
      body: messageData.body,
      icon: messageData.icon,
      badge: messageData.badge,
      url: messageData.url,
      deviceCount: webDevices.length,
      ...messageData.payload
    },
    channels: ['web_push'],
    priority: options.priority || 'normal',
    metadata: {
      source: 'web_push_api',
      channel: 'web_push',
      deviceCount: webDevices.length,
      ...options.metadata
    }
  };

  logger.info('Sending web push notification', {
    meta: {
      userId,
      deviceCount: webDevices.length,
      workflowId: messageData.workflowId
    }
  });

  return await sendNotification(notificationData, req, next);
});

export const sendMobilePush = asyncHandler(async (userId, messageData, options = {}, req, next) => {
  let mobileDevices = [];

  // Get devices based on device type filter
  if (options.deviceType && options.deviceType !== 'all') {
    if (!['ios', 'android'].includes(options.deviceType)) {
      return httpError(
        next,
        new Error('Invalid device type. Must be ios, android, or all'),
        req,
        400
      );
    }
    mobileDevices = await notificationRepository.getDevicesByType(userId, options.deviceType, true);
  } else {
    // Get all mobile devices (iOS and Android)
    const iosDevices = await notificationRepository.getDevicesByType(userId, 'ios', true);
    const androidDevices = await notificationRepository.getDevicesByType(userId, 'android', true);
    mobileDevices = [...iosDevices, ...androidDevices];
  }

  if (mobileDevices.length === 0) {
    return httpError(next, new Error('No active mobile devices found for user'), req, 404);
  }

  // Prepare mobile push notification data
  const notificationData = {
    userId,
    workflowId: messageData.workflowId,
    payload: {
      title: messageData.title,
      body: messageData.body,
      data: messageData.data || {},
      badge: messageData.badge,
      sound: messageData.sound || 'default',
      deviceCount: mobileDevices.length,
      deviceTypes: [...new Set(mobileDevices.map((d) => d.deviceType))],
      ...messageData.payload
    },
    channels: ['mobile_push'],
    priority: options.priority || 'normal',
    metadata: {
      source: 'mobile_push_api',
      channel: 'mobile_push',
      deviceCount: mobileDevices.length,
      deviceType: options.deviceType || 'all',
      ...options.metadata
    }
  };

  logger.info('Sending mobile push notification', {
    meta: {
      userId,
      deviceCount: mobileDevices.length,
      deviceTypes: [...new Set(mobileDevices.map((d) => d.deviceType))],
      workflowId: messageData.workflowId
    }
  });

  return await sendNotification(notificationData, req, next);
});

export const sendInApp = asyncHandler(async (userId, messageData, options = {}, req, next) => {
  // Validate user exists
  const user = await User.findById(userId).select('_id firstName lastName novuSubscriberId');
  if (!user) {
    return httpError(next, new Error('User not found'), req, 404);
  }

  // Prepare in-app notification data
  const notificationData = {
    userId,
    workflowId: messageData.workflowId,
    payload: {
      title: messageData.title,
      content: messageData.content,
      type: messageData.type || 'info',
      actionUrl: messageData.actionUrl,
      actionText: messageData.actionText,
      avatar: messageData.avatar,
      createdAt: new Date().toISOString(),
      ...messageData.payload
    },
    channels: ['in_app'],
    priority: options.priority || 'normal',
    metadata: {
      source: 'in_app_api',
      channel: 'in_app',
      type: messageData.type || 'info',
      ...options.metadata
    }
  };

  logger.info('Sending in-app notification', {
    meta: {
      userId,
      type: messageData.type || 'info',
      workflowId: messageData.workflowId
    }
  });

  return await sendNotification(notificationData, req, next);
});

// ===== CHANNEL-SPECIFIC UTILITY FUNCTIONS =====

const isValidPhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');

  // Check if it's a valid length (7-15 digits as per E.164)
  if (cleanPhone.length < 7 || cleanPhone.length > 15) {
    return false;
  }

  // Basic format validation (starts with + or digit)
  const phoneRegex = /^[+]?[1-9][\d]{6,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-)]/g, ''));
};

const maskPhoneNumber = (phone) => {
  if (!phone || phone.length < 4) {
    return '***';
  }

  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 4) {
    return '***';
  }

  const lastFour = cleanPhone.slice(-4);
  const masked = '*'.repeat(cleanPhone.length - 4) + lastFour;

  return masked;
};

// ===== SUBSCRIBER AND PREFERENCE MANAGEMENT FUNCTIONS =====

export const createSubscriber = asyncHandler(async (userData, req, next) => {
  const { user } = req;
  const subscriberId = user._id;
  // Prepare subscriber data for Novu
  const subscriberData = {
    subscriberId,
    email: userData.email,
    firstName: userData.firstName || '',
    lastName: userData.lastName || '',
    phone: userData.phone || '',
    data: {
      userId: userData.userId,
      createdAt: new Date().toISOString(),
      ...userData.data
    }
  };

  // Create subscriber in Novu
  const novuSubscriber = await novuHelper.createNovuSubscriber(subscriberData);

  // Update user model with Novu subscriber ID if not already set
  if (!userData.novuSubscriberId) {
    await User.findByIdAndUpdate(userData.userId, {
      novuSubscriberId: subscriberId
    });
  }

  logger.info('Novu subscriber created successfully', {
    meta: {
      subscriberId,
      userId: userData.userId
    }
  });

  return {
    subscriberId,
    novuData: novuSubscriber,
    createdAt: new Date()
  };
});

export const updateSubscriber = asyncHandler(async (userId, updates, req, next) => {
  const { user } = req;
  const subscriberId = user._id;
  // Update subscriber in Novu
  const updatedSubscriber = await novuHelper.updateNovuSubscriber(subscriberId, updates);

  logger.info('Novu subscriber updated successfully', {
    meta: {
      subscriberId,
      userId
    }
  });

  return {
    subscriberId,
    novuData: updatedSubscriber,
    updatedAt: new Date()
  };
});

export const deleteSubscriber = asyncHandler(async (userId, req, next) => {
  const { user } = req;
  const subscriberId = user._id;

  // Delete subscriber from Novu
  await novuHelper.deleteNovuSubscriber(subscriberId);

  // Remove Novu subscriber ID from user model
  await User.findByIdAndUpdate(userId, {
    $unset: { novuSubscriberId: 1 }
  });

  // Clean up local notification data
  await notificationRepository.removeDeviceToken(userId, null); // Remove all devices
  await NotificationPreferences.findOneAndDelete({ userId });

  logger.info('Novu subscriber deleted successfully', {
    meta: {
      subscriberId,
      userId
    }
  });

  return {
    subscriberId,
    deletedAt: new Date(),
    message: 'Subscriber deleted successfully'
  };
});

export const updatePreferences = asyncHandler(async (userId, preferences, req) => {
  const { user } = req;
  const subscriberId = user._id;

  // Save preferences locally
  const savedPreferences = await notificationRepository.saveUserPreferences(userId, preferences);

  // Sync preferences with Novu for each workflow/template
  if (preferences.channels) {
    try {
      // Get current Novu preferences to update them
      const currentNovuPrefs = await novuHelper.getNovuSubscriberPreferences(subscriberId);

      // Update Novu preferences for each template/workflow
      for (const [channelType, channelPrefs] of Object.entries(preferences.channels)) {
        if (channelPrefs.workflows && Array.isArray(channelPrefs.workflows)) {
          for (const workflowId of channelPrefs.workflows) {
            try {
              await novuHelper.updateNovuPreferences(subscriberId, workflowId, {
                enabled: channelPrefs.enabled,
                channels: {
                  [channelType]: channelPrefs.enabled
                }
              });
            } catch (workflowError) {
              logger.warn('Failed to update Novu preference for workflow', {
                meta: {
                  subscriberId,
                  workflowId,
                  channelType,
                  error: workflowError.message
                }
              });
            }
          }
        }
      }
    } catch (novuError) {
      logger.warn('Failed to sync some preferences with Novu', {
        meta: {
          subscriberId,
          error: novuError.message
        }
      });
      // Continue with local preferences even if Novu sync fails
    }
  }

  logger.info('Notification preferences updated successfully', {
    meta: {
      subscriberId,
      userId
    }
  });

  return {
    preferences: savedPreferences,
    updatedAt: new Date(),
    syncedWithNovu: true
  };
});

export const getPreferences = asyncHandler(async (userId) => {
  // Get local preferences
  const preferences = await notificationRepository.getUserPreferences(userId);

  logger.info('Notification preferences retrieved successfully', {
    meta: {
      userId,
      hasPreferences: Boolean(preferences._id)
    }
  });

  return preferences;
});

export const registerDevice = asyncHandler(async (userId, deviceData, req) => {
  const { user } = req;
  const subscriberId = user._id;

  // Save device locally
  const savedDevice = await notificationRepository.saveDeviceToken(user._id, deviceData);

  // Update Novu subscriber credentials for push notifications
  try {
    if (deviceData.deviceType === 'web') {
      // For web push, update with endpoint and keys
      await novuHelper.updateSubscriberCredentials(subscriberId, 'web-push', {
        deviceTokens: [deviceData.token]
        // endpoint: deviceData.endpoint,
        // keys: deviceData.keys
      });
    } else if (deviceData.deviceType === 'ios') {
      // For iOS, update APNS credentials
      await novuHelper.updateSubscriberCredentials(subscriberId, 'apns', {
        deviceTokens: [deviceData.token]
      });
    } else if (deviceData.deviceType === 'android') {
      // For Android, update FCM credentials
      await novuHelper.updateSubscriberCredentials(subscriberId, 'fcm', {
        deviceTokens: [deviceData.token]
      });
    }
  } catch (novuError) {
    logger.warn('Failed to update Novu subscriber credentials', {
      meta: {
        subscriberId,
        deviceType: deviceData.deviceType,
        error: novuError.message
      }
    });
    // Continue even if Novu update fails
  }

  logger.info('Device registered successfully', {
    meta: {
      userId,
      deviceId: deviceData.deviceId,
      deviceType: deviceData.deviceType
    }
  });

  return {
    device: {
      id: savedDevice._id,
      deviceId: savedDevice.deviceId,
      deviceType: savedDevice.deviceType,
      isActive: savedDevice.isActive,
      registeredAt: savedDevice.createdAt
    },
    message: 'Device registered successfully'
  };
});

export const unregisterDevice = asyncHandler(async (userId, deviceId, req, next) => {
  // Validate user exists
  const { user } = req;
  const subscriberId = user._id;

  // Remove device locally
  const removedDevice = await notificationRepository.removeDeviceToken(userId, deviceId);

  if (!removedDevice) {
    return httpError(next, new Error('Device not found'), req, 404);
  }

  // Update Novu subscriber credentials to remove the device
  try {
    const providerId =
      removedDevice.deviceType === 'web'
        ? 'web-push'
        : removedDevice.deviceType === 'ios'
          ? 'apns'
          : 'fcm';

    await novuHelper.removeSubscriberCredentials(subscriberId, providerId);
  } catch (novuError) {
    logger.warn('Failed to remove Novu subscriber credentials', {
      meta: {
        subscriberId,
        deviceType: removedDevice.deviceType,
        error: novuError.message
      }
    });
    // Continue even if Novu update fails
  }

  logger.info('Device unregistered successfully', {
    meta: {
      userId,
      deviceId,
      deviceType: removedDevice.deviceType
    }
  });

  return {
    message: 'Device unregistered successfully',
    unregisteredAt: new Date()
  };
});
// ===== NOTIFICATION HISTORY AND ANALYTICS FUNCTIONS =====

export const getNotificationHistory = asyncHandler(async (userId, filters = {}, req, next) => {
  // Validate user exists
  const user = await User.findById(userId).select('_id');
  if (!user) {
    return httpError(next, new Error('User not found'), req, 404);
  }

  // Get history from repository
  const history = await notificationRepository.getNotificationHistory(userId, filters);

  // Enhance history with additional metadata
  const enhancedHistory = {
    ...history,
    filters: {
      applied: filters,
      available: {
        status: ['pending', 'sent', 'delivered', 'failed', 'read'],
        channels: ['sms', 'email', 'web_push', 'mobile_push', 'in_app'],
        dateRange: 'startDate and endDate in ISO format'
      }
    },
    summary: {
      totalNotifications: history.pagination.totalCount,
      currentPage: history.pagination.currentPage,
      totalPages: history.pagination.totalPages
    }
  };

  logger.info('Notification history retrieved successfully', {
    meta: {
      userId,
      totalCount: history.pagination.totalCount,
      currentPage: history.pagination.currentPage
    }
  });

  return enhancedHistory;
});

export const getNotificationStats = asyncHandler(async (userId = null, options = {}, req, next) => {
  // If userId provided, validate user exists
  if (userId) {
    const user = await User.findById(userId).select('_id novuSubscriberId');
    if (!user) {
      return httpError(next, new Error('User not found'), req, 404);
    }
  }

  logger.info('Calculating notification statistics', {
    meta: {
      userId: userId || 'system-wide',
      options
    }
  });

  // Build date range filter
  const dateFilter = {};
  if (options.startDate) {
    dateFilter.$gte = new Date(options.startDate);
  }
  if (options.endDate) {
    dateFilter.$lte = new Date(options.endDate);
  }

  // Build base query
  const baseQuery = {};
  if (userId) {
    baseQuery.userId = userId;
  }
  if (Object.keys(dateFilter).length > 0) {
    baseQuery.createdAt = dateFilter;
  }

  // Get aggregated statistics from repository
  const { overallStats, channelStats, workflowStats, timeStats } =
    await notificationRepository.getNotificationStatsAggregation(baseQuery, options);

  // Get recent activity from repository
  const recentActivity = await notificationRepository.getRecentNotificationActivity(baseQuery, 10);

  // Compile final statistics
  const stats = {
    overview: {
      totalNotifications: overallStats.totalNotifications,
      totalChannels: overallStats.totalChannels,
      avgChannelsPerNotification: Math.round(overallStats.avgChannelsPerNotification * 100) / 100
    },
    channels: channelStats.reduce((acc, channel) => {
      acc[channel._id] = {
        total: channel.total,
        pending: channel.pending,
        sent: channel.sent,
        delivered: channel.delivered,
        failed: channel.failed,
        read: channel.read,
        successRate: Math.round(channel.successRate * 100) / 100,
        deliveryRate: Math.round(channel.deliveryRate * 100) / 100
      };
      return acc;
    }, {}),
    workflows: workflowStats.map((workflow) => ({
      workflowId: workflow._id,
      total: workflow.total,
      avgChannels: Math.round(workflow.avgChannels * 100) / 100,
      lastSent: workflow.lastSent,
      firstSent: workflow.firstSent
    })),
    timeline: timeStats.map((period) => ({
      period: period._id,
      notifications: period.count,
      channels: period.channels
    })),
    recentActivity: recentActivity.map((activity) => ({
      workflowId: activity.workflowId,
      channels: activity.channels.map((c) => ({ type: c.type, status: c.status })),
      sentAt: activity.createdAt
    })),
    metadata: {
      userId: userId || null,
      dateRange: {
        startDate: options.startDate || null,
        endDate: options.endDate || null
      },
      groupBy: options.groupBy || null,
      channelFilter: options.channels || null,
      generatedAt: new Date()
    }
  };

  // Get Novu statistics if user has subscriber ID
  if (userId) {
    try {
      const user = await User.findById(userId).select('novuSubscriberId');
      if (user?.novuSubscriberId) {
        const novuStats = await novuHelper.getNovuNotificationStats(user.novuSubscriberId, {
          page: 0,
          limit: 50
        });

        stats.novu = {
          totalCount: novuStats.totalCount || 0,
          hasMore: novuStats.hasMore || false,
          lastActivity: novuStats.data?.[0]?.createdAt || null
        };
      }
    } catch (novuError) {
      logger.warn('Failed to fetch Novu statistics', {
        meta: {
          userId,
          error: novuError.message
        }
      });
      // Continue without Novu stats
    }
  }

  logger.info('Notification statistics calculated successfully', {
    meta: {
      userId: userId || 'system-wide',
      totalNotifications: stats.overview.totalNotifications,
      channelCount: Object.keys(stats.channels).length
    }
  });

  return stats;
});

export const getDeliveryMetrics = asyncHandler(async (options = {}) => {
  logger.info('Calculating delivery metrics', {
    meta: {
      options
    }
  });

  // Build date filter
  const dateFilter = {};
  if (options.startDate) {
    dateFilter.$gte = new Date(options.startDate);
  }
  if (options.endDate) {
    dateFilter.$lte = new Date(options.endDate);
  }

  const baseQuery = {};
  if (Object.keys(dateFilter).length > 0) {
    baseQuery.createdAt = dateFilter;
  }

  // Get delivery metrics from repository
  const result = await notificationRepository.getDeliveryMetricsAggregation(baseQuery);

  // Calculate rates
  const deliveryRate =
    result.totalAttempts > 0 ? (result.successful / result.totalAttempts) * 100 : 0;

  const failureRate = result.totalAttempts > 0 ? (result.failed / result.totalAttempts) * 100 : 0;

  const deliveryMetrics = {
    totalAttempts: result.totalAttempts,
    successful: result.successful,
    failed: result.failed,
    pending: result.pending,
    deliveryRate: Math.round(deliveryRate * 100) / 100,
    failureRate: Math.round(failureRate * 100) / 100,
    avgDeliveryTimeMs: Math.round(result.avgDeliveryTime || 0),
    avgDeliveryTimeSeconds: Math.round(((result.avgDeliveryTime || 0) / 1000) * 100) / 100,
    period: {
      startDate: options.startDate || null,
      endDate: options.endDate || null
    },
    calculatedAt: new Date()
  };

  logger.info('Delivery metrics calculated successfully', {
    meta: {
      totalAttempts: deliveryMetrics.totalAttempts,
      deliveryRate: deliveryMetrics.deliveryRate
    }
  });

  return deliveryMetrics;
});

// ===== PHASE 1 ENHANCEMENTS: SCHEDULED, TOPICS, READ/SEEN, DELETE =====

export const scheduleNotification = asyncHandler(async (notificationData, req, next) => {
  const user = await User.findById(notificationData.userId).select(
    'email firstName lastName phone novuSubscriberId'
  );

  if (!user) {
    return httpError(next, new Error('User not found'), req, 404);
  }

  const sanitizedPayload = sanitizeNotificationContent(notificationData.payload);

  const scheduledDate = new Date(notificationData.scheduledFor);
  const now = new Date();
  const delayMs = scheduledDate.getTime() - now.getTime();

  if (delayMs < 0) {
    return httpError(next, new Error('Scheduled date must be in the future'), req, 400);
  }

  const delayInSeconds = Math.floor(delayMs / 1000);

  const workflowData = {
    name: notificationData.workflowId,
    to: {
      subscriberId: user.novuSubscriberId || user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    },
    payload: sanitizedPayload
  };

  const delayOptions = {
    amount: delayInSeconds,
    unit: 'seconds'
  };

  const novuResponse = await novuHelper.triggerWorkflowWithDelay(workflowData, delayOptions);

  const logData = {
    userId: notificationData.userId,
    transactionId: novuResponse.transactionId,
    workflowId: notificationData.workflowId,
    channels: (notificationData.channels || []).map((type) => ({
      type,
      status: 'scheduled',
      sentAt: null
    })),
    payload: sanitizedPayload,
    metadata: {
      source: 'scheduled_api',
      priority: notificationData.priority || 'normal',
      scheduledFor: scheduledDate.toISOString(),
      delaySeconds: delayInSeconds
    }
  };

  await notificationRepository.saveNotificationLog(logData);

  logger.info('Notification scheduled successfully', {
    meta: {
      userId: notificationData.userId,
      workflowId: notificationData.workflowId,
      scheduledFor: scheduledDate.toISOString(),
      transactionId: novuResponse.transactionId
    }
  });

  return {
    transactionId: novuResponse.transactionId,
    status: 'scheduled',
    scheduledFor: scheduledDate.toISOString(),
    workflowId: notificationData.workflowId
  };
});

export const cancelScheduledNotification = asyncHandler(async (transactionId, req, next) => {
  const result = await novuHelper.cancelTriggeredEvent(transactionId);

  logger.info('Scheduled notification cancelled', {
    meta: { transactionId }
  });

  return {
    transactionId,
    status: 'cancelled',
    cancelledAt: new Date()
  };
});

export const createNotificationTopic = asyncHandler(async (topicData, req, next) => {
  const result = await novuHelper.createTopic(topicData);

  logger.info('Notification topic created', {
    meta: { topicKey: topicData.key, topicName: topicData.name }
  });

  return result;
});

export const addSubscribersToTopic = asyncHandler(async (topicKey, subscriberIds, req, next) => {
  const result = await novuHelper.addSubscribersToTopic(topicKey, subscriberIds);

  logger.info('Subscribers added to topic', {
    meta: { topicKey, count: Array.isArray(subscriberIds) ? subscriberIds.length : 1 }
  });

  return result;
});

export const removeSubscribersFromTopic = asyncHandler(
  async (topicKey, subscriberIds, req, next) => {
    await novuHelper.removeSubscribersFromTopic(topicKey, subscriberIds);

    logger.info('Subscribers removed from topic', {
      meta: { topicKey, count: Array.isArray(subscriberIds) ? subscriberIds.length : 1 }
    });

    return {
      topicKey,
      removedCount: Array.isArray(subscriberIds) ? subscriberIds.length : 1,
      removedAt: new Date()
    };
  }
);

export const triggerNotificationToTopic = asyncHandler(
  async (workflowName, topicKey, payload, req, next) => {
    const sanitizedPayload = sanitizeNotificationContent(payload);

    const novuResponse = await novuHelper.triggerWorkflowToTopic(
      workflowName,
      topicKey,
      sanitizedPayload
    );

    logger.info('Notification triggered to topic', {
      meta: {
        workflowName,
        topicKey,
        transactionId: novuResponse.transactionId
      }
    });

    return {
      transactionId: novuResponse.transactionId,
      status: 'sent',
      workflowName,
      topicKey,
      sentAt: new Date()
    };
  }
);

export const getUnseenNotificationCount = asyncHandler(async (userId, req, next) => {
  const user = await User.findById(userId).select('novuSubscriberId');

  if (!user) {
    return httpError(next, new Error('User not found'), req, 404);
  }

  const subscriberId = user.novuSubscriberId || user._id.toString();

  const result = await novuHelper.getUnseenCount(subscriberId, false);

  logger.info('Unseen notification count retrieved', {
    meta: { userId, subscriberId, count: result.count }
  });

  return result;
});

export const markNotificationAsRead = asyncHandler(async (userId, messageId, req, next) => {
  const user = await User.findById(userId).select('novuSubscriberId');

  if (!user) {
    return httpError(next, new Error('User not found'), req, 404);
  }

  const subscriberId = user.novuSubscriberId || user._id.toString();

  const result = await novuHelper.markMessageAsRead(subscriberId, messageId);

  logger.info('Notification marked as read', {
    meta: { userId, subscriberId, messageId }
  });

  return result;
});

export const markNotificationAsSeen = asyncHandler(async (userId, messageId, req, next) => {
  const user = await User.findById(userId).select('novuSubscriberId');

  if (!user) {
    return httpError(next, new Error('User not found'), req, 404);
  }

  const subscriberId = user.novuSubscriberId || user._id.toString();

  const result = await novuHelper.markMessageAsSeen(subscriberId, messageId);

  logger.info('Notification marked as seen', {
    meta: { userId, subscriberId, messageId }
  });

  return result;
});

export const markAllNotificationsAsRead = asyncHandler(async (userId, req, next) => {
  const user = await User.findById(userId).select('novuSubscriberId');

  if (!user) {
    return httpError(next, new Error('User not found'), req, 404);
  }

  const subscriberId = user.novuSubscriberId || user._id.toString();

  const result = await novuHelper.markAllMessagesAsRead(subscriberId);

  logger.info('All notifications marked as read', {
    meta: { userId, subscriberId }
  });

  return result;
});

export const deleteNotification = asyncHandler(async (userId, messageId, req, next) => {
  const user = await User.findById(userId).select('novuSubscriberId');

  if (!user) {
    return httpError(next, new Error('User not found'), req, 404);
  }

  const subscriberId = user.novuSubscriberId || user._id.toString();

  const result = await novuHelper.removeMessage(subscriberId, messageId);

  logger.info('Notification deleted', {
    meta: { userId, subscriberId, messageId }
  });

  return {
    messageId,
    deletedAt: new Date(),
    message: 'Notification deleted successfully'
  };
});
