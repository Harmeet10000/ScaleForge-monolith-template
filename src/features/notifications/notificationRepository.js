import { NotificationLog } from './notificationLogModel.js';
import { NotificationPreferences } from './notificationPreferencesModel.js';
import { Device } from './deviceModel.js';
import APIFeatures from '../../utils/apiFeatures.js';
import asyncHandler from 'express-async-handler';

export const saveNotificationLog = asyncHandler(async (notificationData) => {
  const savedLog = await NotificationLog.create({
    userId: notificationData.userId,
    transactionId: notificationData.transactionId,
    workflowId: notificationData.workflowId,
    channels: notificationData.channels || [],
    payload: notificationData.payload,
    metadata: {
      source: notificationData.metadata?.source || 'api',
      priority: notificationData.metadata?.priority || 'normal',
      tags: notificationData.metadata?.tags || [],
      correlationId: notificationData.metadata?.correlationId
    }
  });

  return savedLog;
});

export const createBroadcastLog = asyncHandler(async (broadcastData) => {
  const savedLog = await NotificationLog.create({
    userId: null, // Broadcast doesn't have a specific user
    transactionId: broadcastData.transactionId,
    workflowId: broadcastData.workflowId,
    channels: [], // Broadcast channels are determined by Novu
    payload: broadcastData.payload,
    isBroadcast: true,
    tenant: broadcastData.tenant,
    metadata: {
      source: broadcastData.metadata?.source || 'api',
      priority: broadcastData.priority || 'normal',
      tags: broadcastData.metadata?.tags || [],
      correlationId: broadcastData.metadata?.correlationId,
      userAgent: broadcastData.metadata?.userAgent,
      ipAddress: broadcastData.metadata?.ipAddress,
      overrides: broadcastData.overrides
    }
  });

  return savedLog;
});

// ===== NOTIFICATION STATISTICS AGGREGATION FUNCTIONS =====

export const getNotificationStatsAggregation = asyncHandler(async (baseQuery, options = {}) => {
  // Calculate overall statistics
  const overallStats = await NotificationLog.aggregate([
    { $match: baseQuery },
    {
      $group: {
        _id: null,
        totalNotifications: { $sum: 1 },
        totalChannels: { $sum: { $size: '$channels' } },
        avgChannelsPerNotification: { $avg: { $size: '$channels' } }
      }
    }
  ]);

  // Calculate channel-wise statistics
  const channelStats = await NotificationLog.aggregate([
    { $match: baseQuery },
    { $unwind: '$channels' },
    ...(options.channels ? [{ $match: { 'channels.type': { $in: options.channels } } }] : []),
    {
      $group: {
        _id: '$channels.type',
        total: { $sum: 1 },
        pending: { $sum: { $cond: [{ $eq: ['$channels.status', 'pending'] }, 1, 0] } },
        sent: { $sum: { $cond: [{ $eq: ['$channels.status', 'sent'] }, 1, 0] } },
        delivered: { $sum: { $cond: [{ $eq: ['$channels.status', 'delivered'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$channels.status', 'failed'] }, 1, 0] } },
        read: { $sum: { $cond: [{ $eq: ['$channels.status', 'read'] }, 1, 0] } }
      }
    },
    {
      $addFields: {
        successRate: {
          $cond: [
            { $gt: ['$total', 0] },
            { $multiply: [{ $divide: [{ $add: ['$delivered', '$read'] }, '$total'] }, 100] },
            0
          ]
        },
        deliveryRate: {
          $cond: [
            { $gt: ['$total', 0] },
            { $multiply: [{ $divide: ['$delivered', '$total'] }, 100] },
            0
          ]
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Calculate workflow-wise statistics
  const workflowStats = await NotificationLog.aggregate([
    { $match: baseQuery },
    {
      $group: {
        _id: '$workflowId',
        total: { $sum: 1 },
        avgChannels: { $avg: { $size: '$channels' } },
        lastSent: { $max: '$createdAt' },
        firstSent: { $min: '$createdAt' }
      }
    },
    { $sort: { total: -1 } },
    { $limit: 10 } // Top 10 workflows
  ]);

  // Calculate time-based statistics if groupBy is specified
  let timeStats = [];
  if (options.groupBy) {
    const groupByFormat = {
      day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      week: { $dateToString: { format: '%Y-W%U', date: '$createdAt' } },
      month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
    };

    if (groupByFormat[options.groupBy]) {
      timeStats = await NotificationLog.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: groupByFormat[options.groupBy],
            count: { $sum: 1 },
            channels: { $sum: { $size: '$channels' } }
          }
        },
        { $sort: { _id: 1 } }
      ]);
    }
  }

  return {
    overallStats: overallStats[0] || {
      totalNotifications: 0,
      totalChannels: 0,
      avgChannelsPerNotification: 0
    },
    channelStats,
    workflowStats,
    timeStats
  };
});

export const getRecentNotificationActivity = asyncHandler(
  async (baseQuery, limit = 10) =>
    await NotificationLog.find(baseQuery)
      .select('workflowId channels.type channels.status createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
);

export const getDeliveryMetricsAggregation = asyncHandler(async (baseQuery) => {
  const metrics = await NotificationLog.aggregate([
    { $match: baseQuery },
    { $unwind: '$channels' },
    {
      $group: {
        _id: null,
        totalAttempts: { $sum: 1 },
        successful: {
          $sum: {
            $cond: [{ $in: ['$channels.status', ['delivered', 'read']] }, 1, 0]
          }
        },
        failed: {
          $sum: {
            $cond: [{ $eq: ['$channels.status', 'failed'] }, 1, 0]
          }
        },
        pending: {
          $sum: {
            $cond: [{ $eq: ['$channels.status', 'pending'] }, 1, 0]
          }
        },
        avgDeliveryTime: {
          $avg: {
            $cond: [
              { $and: ['$channels.sentAt', '$channels.deliveredAt'] },
              {
                $subtract: ['$channels.deliveredAt', '$channels.sentAt']
              },
              null
            ]
          }
        }
      }
    }
  ]);

  return (
    metrics[0] || {
      totalAttempts: 0,
      successful: 0,
      failed: 0,
      pending: 0,
      avgDeliveryTime: 0
    }
  );
});

export const getNotificationHistory = asyncHandler(async (userId, filters = {}) => {
  const query = { userId };

  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      query.createdAt.$lte = new Date(filters.endDate);
    }
  }

  if (filters.workflowId) {
    query.workflowId = filters.workflowId;
  }

  if (filters.channel) {
    query['channels.type'] = filters.channel;
  }

  if (filters.status) {
    query['channels.status'] = filters.status;
  }

  const mockReq = {
    query: {
      page: filters.page || 1,
      limit: filters.limit || 20,
      sort: filters.sort || '-createdAt'
    }
  };

  const features = new APIFeatures(NotificationLog.find(query), mockReq.query).sort().paginate();

  const notifications = await features.query.select('-payload').lean();

  const totalCount = await NotificationLog.countDocuments(query);
  const totalPages = Math.ceil(totalCount / (filters.limit || 20));

  return {
    notifications,
    pagination: {
      currentPage: filters.page || 1,
      totalPages,
      totalCount,
      hasNextPage: filters.page || 1 < totalPages,
      hasPrevPage: filters.page || 1 > 1
    }
  };
});

export const updateNotificationStatus = asyncHandler(
  async (transactionId, channelType, statusUpdate) => {
    const updateFields = {};
    const arrayFilters = [];

    switch (statusUpdate.status) {
      case 'sent':
        updateFields['channels.$[channel].status'] = 'sent';
        updateFields['channels.$[channel].sentAt'] = statusUpdate.timestamp || new Date();
        break;
      case 'delivered':
        updateFields['channels.$[channel].status'] = 'delivered';
        updateFields['channels.$[channel].deliveredAt'] = statusUpdate.timestamp || new Date();
        break;
      case 'read':
        updateFields['channels.$[channel].status'] = 'read';
        updateFields['channels.$[channel].readAt'] = statusUpdate.timestamp || new Date();
        break;
      case 'failed':
        updateFields['channels.$[channel].status'] = 'failed';
        updateFields['channels.$[channel].errorMessage'] = statusUpdate.errorMessage;
        updateFields['channels.$[channel].errorCode'] = statusUpdate.errorCode;
        updateFields['$inc'] = { 'channels.$[channel].retryCount': 1 };
        break;
    }

    arrayFilters.push({ 'channel.type': channelType });

    const updatedLog = await NotificationLog.findOneAndUpdate({ transactionId }, updateFields, {
      new: true,
      arrayFilters,
      runValidators: true
    });

    if (!updatedLog) {
      return null;
    }

    return updatedLog;
  }
);

export const saveUserPreferences = asyncHandler(async (userId, preferences) => {
  const sanitizedPreferences = {
    userId,
    channels: {
      sms: {
        enabled: Boolean(preferences.channels?.sms?.enabled ?? true),
        workflows: Array.isArray(preferences.channels?.sms?.workflows)
          ? preferences.channels.sms.workflows.filter((w) => typeof w === 'string')
          : []
      },
      email: {
        enabled: Boolean(preferences.channels?.email?.enabled ?? true),
        workflows: Array.isArray(preferences.channels?.email?.workflows)
          ? preferences.channels.email.workflows.filter((w) => typeof w === 'string')
          : []
      },
      web_push: {
        enabled: Boolean(preferences.channels?.web_push?.enabled ?? true),
        workflows: Array.isArray(preferences.channels?.web_push?.workflows)
          ? preferences.channels.web_push.workflows.filter((w) => typeof w === 'string')
          : []
      },
      mobile_push: {
        enabled: Boolean(preferences.channels?.mobile_push?.enabled ?? true),
        workflows: Array.isArray(preferences.channels?.mobile_push?.workflows)
          ? preferences.channels.mobile_push.workflows.filter((w) => typeof w === 'string')
          : []
      },
      in_app: {
        enabled: Boolean(preferences.channels?.in_app?.enabled ?? true),
        workflows: Array.isArray(preferences.channels?.in_app?.workflows)
          ? preferences.channels.in_app.workflows.filter((w) => typeof w === 'string')
          : []
      }
    },
    globalSettings: {
      doNotDisturb: {
        enabled: Boolean(preferences.globalSettings?.doNotDisturb?.enabled ?? false),
        startTime: preferences.globalSettings?.doNotDisturb?.startTime || '22:00',
        endTime: preferences.globalSettings?.doNotDisturb?.endTime || '08:00'
      },
      timezone: preferences.globalSettings?.timezone || 'UTC'
    }
  };

  const savedPreferences = await NotificationPreferences.findOneAndUpdate(
    { userId },
    sanitizedPreferences,
    {
      new: true,
      upsert: true,
      runValidators: true
    }
  );

  return savedPreferences;
});

export const getUserPreferences = asyncHandler(async (userId) => {
  let preferences = await NotificationPreferences.findOne({ userId }).lean();

  if (!preferences) {
    preferences = {
      userId,
      channels: {
        sms: { enabled: true, workflows: [] },
        email: { enabled: true, workflows: [] },
        web_push: { enabled: true, workflows: [] },
        mobile_push: { enabled: true, workflows: [] },
        in_app: { enabled: true, workflows: [] }
      },
      globalSettings: {
        doNotDisturb: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00'
        },
        timezone: 'UTC'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  return preferences;
});

export const saveDeviceToken = asyncHandler(async (userId, deviceData) => {
  const existingDevice = await Device.findOne({
    userId,
    deviceId: deviceData.deviceId
  });

  let device;
  if (existingDevice) {
    existingDevice.token = deviceData.token;
    existingDevice.endpoint = deviceData.endpoint;
    existingDevice.keys = deviceData.keys;
    existingDevice.userAgent = deviceData.userAgent;
    existingDevice.isActive = true;
    existingDevice.lastUsed = new Date();

    device = await existingDevice.save();
  } else {
    device = await Device.create({
      userId,
      deviceId: deviceData.deviceId,
      deviceType: deviceData.deviceType,
      token: deviceData.token,
      endpoint: deviceData.endpoint,
      keys: deviceData.keys,
      userAgent: deviceData.userAgent,
      isActive: true,
      lastUsed: new Date()
    });
  }

  return device;
});

export const removeDeviceToken = asyncHandler(async (userId, deviceId) => {
  const removedDevice = await Device.findOneAndDelete({
    userId,
    deviceId
  });

  return removedDevice;
});

export const getUserDevices = asyncHandler(async (userId, activeOnly = true) => {
  const query = { userId };
  if (activeOnly) {
    query.isActive = true;
  }

  const devices = await Device.find(query).select('-token -keys').sort({ lastUsed: -1 }).lean();

  return devices;
});

export const deactivateDevice = asyncHandler(async (userId, deviceId) => {
  const updatedDevice = await Device.findOneAndUpdate(
    { userId, deviceId },
    {
      isActive: false,
      lastUsed: new Date()
    },
    { new: true }
  );

  return updatedDevice;
});

export const getDevicesByType = asyncHandler(async (userId, deviceType, activeOnly = true) => {
  const query = { userId, deviceType };
  if (activeOnly) {
    query.isActive = true;
  }

  const devices = await Device.find(query).sort({ lastUsed: -1 }).lean();

  return devices;
});
