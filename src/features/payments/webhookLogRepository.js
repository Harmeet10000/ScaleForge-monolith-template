import { WebhookLog } from './webhookLogModel.js';
import asyncHandler from 'express-async-handler';
import { httpError } from '../../utils/httpError.js';

// Create a webhook log entry
// data: Webhook log data (eventType, correlationId, signature, signatureValid, payload, processingStatus, errorMessage, errorStack, processingTimeMs, relatedPaymentId, relatedSubscriptionId, webhookId, ipAddress, userAgent, nextRetryAt)
// session: Optional transaction session
// Returns: Promise<Object> Created webhook log
export const createWebhookLog = asyncHandler(async (data, session = null) => {
  const logData = {
    eventType: data.eventType,
    correlationId: data.correlationId,
    signature: data.signature,
    signatureValid: data.signatureValid,
    payload: data.payload,
    processingStatus: data.processingStatus || 'pending',
    errorMessage: data.errorMessage,
    errorStack: data.errorStack,
    processingTimeMs: data.processingTimeMs,
    relatedPaymentId: data.relatedPaymentId,
    relatedSubscriptionId: data.relatedSubscriptionId,
    webhookId: data.webhookId,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    nextRetryAt: data.nextRetryAt
  };

  const log = new WebhookLog(logData);

  const options = {};
  if (session) {
    options.session = session;
  }

  return await log.save(options);
});

// Find webhook log by correlation ID
// correlationId: Correlation ID
// session: Optional transaction session
// Returns: Promise<Object> Webhook log or null
export const findWebhookLogByCorrelationId = asyncHandler(async (correlationId, session = null) => {
  let query = WebhookLog.findOne({ correlationId });
  if (session) {
    query = query.session(session);
  }
  return await query.exec();
});

// Find webhook log by ID
// logId: Webhook log ID
// session: Optional transaction session
// Returns: Promise<Object> Webhook log or null
export const findWebhookLogById = asyncHandler(async (logId, session = null) => {
  let query = WebhookLog.findById(logId);
  if (session) {
    query = query.session(session);
  }
  return await query.exec();
});

// Find failed webhooks due for retry
// hoursOld: Find webhooks older than this many hours
// session: Optional transaction session
// Returns: Promise<Array> Failed webhook logs
export const findFailedWebhooksForRetry = asyncHandler(async (hoursOld = 1, session = null) => {
  const retryTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);

  let query = WebhookLog.find({
    processingStatus: 'failed',
    nextRetryAt: { $lte: new Date() },
    updatedAt: { $lt: retryTime },
    retryCount: { $lt: 3 } // Max 3 retries
  }).sort({ nextRetryAt: 1 });

  if (session) {
    query = query.session(session);
  }

  return await query.exec();
});

// Update webhook log status
// logId: Webhook log ID
// newStatus: New status
// updates: Additional update data
// session: Optional transaction session
// Returns: Promise<Object> Updated webhook log
export const updateWebhookLogStatus = asyncHandler(
  async (logId, newStatus, updates = {}, session = null) => {
    const updateData = {
      processingStatus: newStatus,
      ...updates,
      updatedAt: new Date()
    };

    const options = { new: true, runValidators: true };
    if (session) {
      options.session = session;
    }

    const log = await WebhookLog.findByIdAndUpdate(logId, updateData, options);

    if (!log) {
      throw new httpError('Webhook log not found', 404);
    }

    return log;
  }
);

// Increment retry count for failed webhook
// logId: Webhook log ID
// nextRetryAt: When to retry next
// session: Optional transaction session
// Returns: Promise<Object> Updated webhook log
export const incrementWebhookRetryCount = asyncHandler(
  async (logId, nextRetryAt, session = null) => {
    const options = { new: true };
    if (session) {
      options.session = session;
    }

    const log = await WebhookLog.findByIdAndUpdate(
      logId,
      {
        $inc: { retryCount: 1 },
        nextRetryAt,
        updatedAt: new Date()
      },
      options
    );

    if (!log) {
      throw new httpError('Webhook log not found', 404);
    }

    return log;
  }
);

// Find webhook logs by event type and date range
// eventType: Event type
// options: Query options (startDate, endDate, status, limit)
// session: Optional transaction session
// Returns: Promise<Array> Webhook logs
export const findWebhookLogsByEventType = asyncHandler(
  async (eventType, options = {}, session = null) => {
    const query = {
      eventType
    };

    if (options.startDate && options.endDate) {
      query.createdAt = {
        $gte: options.startDate,
        $lte: options.endDate
      };
    }

    if (options.status) {
      query.processingStatus = options.status;
    }

    let mongoQuery = WebhookLog.find(query).sort({ createdAt: -1 });

    if (session) {
      mongoQuery = mongoQuery.session(session);
    }

    if (options.limit) {
      mongoQuery = mongoQuery.limit(options.limit);
    }

    return await mongoQuery.exec();
  }
);

// Get webhook processing statistics
// filters: Filter options (eventType, dateRange)
// session: Optional transaction session
// Returns: Promise<Object> Statistics
export const getWebhookStatistics = asyncHandler(async (filters = {}, session = null) => {
  const matchStage = {};

  if (filters.eventType) {
    matchStage.eventType = filters.eventType;
  }

  if (filters.dateRange) {
    matchStage.createdAt = {};
    if (filters.dateRange.start) {
      matchStage.createdAt.$gte = filters.dateRange.start;
    }
    if (filters.dateRange.end) {
      matchStage.createdAt.$lte = filters.dateRange.end;
    }
  }

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: '$processingStatus',
        count: { $sum: 1 },
        avgProcessingTimeMs: { $avg: '$processingTimeMs' }
      }
    }
  ];

  let query = WebhookLog.aggregate(pipeline);
  if (session) {
    query = query.session(session);
  }

  const stats = await query.exec();

  const result = {
    total: 0,
    byStatus: {},
    avgProcessingTimeMs: 0
  };

  stats.forEach((stat) => {
    result.total += stat.count;
    result.byStatus[stat._id] = {
      count: stat.count,
      avgProcessingTimeMs: Math.round(stat.avgProcessingTimeMs || 0)
    };
  });

  return result;
});

// Delete old webhook logs (older than specified days)
// daysOld: Delete logs older than this many days
// session: Optional transaction session
// Returns: Promise<Object> Deletion result
export const deleteOldWebhookLogs = asyncHandler(async (daysOld = 90, session = null) => {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

  const options = {};
  if (session) {
    options.session = session;
  }

  return await WebhookLog.deleteMany({ createdAt: { $lt: cutoffDate } }, options);
});

export default {
  createWebhookLog,
  findWebhookLogByCorrelationId,
  findWebhookLogById,
  findFailedWebhooksForRetry,
  updateWebhookLogStatus,
  incrementWebhookRetryCount,
  findWebhookLogsByEventType,
  getWebhookStatistics,
  deleteOldWebhookLogs
};
