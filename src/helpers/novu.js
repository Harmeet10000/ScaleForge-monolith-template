import asyncHandler from 'express-async-handler';
import { logger } from '../utils/logger.js';
import { novuClient } from '../connections/connectNovu.js';

/* ---------------------------- Workflow Operations ---------------------------- */

export const triggerWorkflow = asyncHandler(async (workflowData) => {
  const response = await novuClient.trigger(workflowData.name, {
    to: workflowData.to,
    payload: workflowData.payload || {},
    overrides: workflowData.overrides || {}
  });

  logger.info('Novu workflow triggered successfully', {
    meta: {
      workflowName: workflowData.name,
      subscriberId: workflowData.to.subscriberId,
      transactionId: response.transactionId
    }
  });

  return response;
});

export const broadcastWorkflow = asyncHandler(async (broadcastData) => {
  const response = await novuClient.broadcast(broadcastData.name, {
    payload: broadcastData.payload || {},
    overrides: broadcastData.overrides || {},
    tenant: broadcastData.tenant
  });

  logger.info('Novu workflow broadcasted successfully', {
    meta: {
      workflowName: broadcastData.name,
      tenant: broadcastData.tenant,
      transactionId: response.transactionId
    }
  });

  return response;
});

/* ---------------------------- Subscriber Operations --------------------------- */

export const createNovuSubscriber = asyncHandler(async (subscriberData) => {
  const response = await novuClient.subscribers.identify(subscriberData.subscriberId, {
    email: subscriberData.email,
    firstName: subscriberData.firstName,
    lastName: subscriberData.lastName,
    phone: subscriberData.phone,
    data: subscriberData.data || {}
  });

  logger.info('Novu subscriber created successfully', {
    meta: { subscriberId: subscriberData.subscriberId, email: subscriberData.email }
  });

  return response;
});

export const updateNovuSubscriber = asyncHandler(async (subscriberId, updates) => {
  const response = await novuClient.subscribers.update(subscriberId, { updates });

  logger.info('Novu subscriber updated successfully', { meta: { subscriberId } });

  return response;
});

export const deleteNovuSubscriber = asyncHandler(async (subscriberId) => {
  await novuClient.subscribers.delete(subscriberId);

  logger.info('Novu subscriber deleted successfully', { meta: { subscriberId } });
});

export const getNovuSubscriber = asyncHandler(async (subscriberId) => {
  const response = await novuClient.subscribers.get(subscriberId);

  logger.info('Novu subscriber retrieved successfully', {
    meta: { subscriberId, email: response.email }
  });

  return response;
});

/* -------------------------- Preferences Operations --------------------------- */

export const updateNovuPreferences = asyncHandler(async (subscriberId, templateId, preferences) => {
  const response = await novuClient.subscribers.updatePreference(
    subscriberId,
    templateId,
    preferences
  );

  logger.info('Novu subscriber preferences updated successfully', {
    meta: { subscriberId, templateId }
  });

  return response;
});

export const getNovuSubscriberPreferences = asyncHandler(async (subscriberId) => {
  const response = await novuClient.subscribers.getPreferences(subscriberId);

  logger.info('Novu subscriber preferences retrieved successfully', {
    meta: { subscriberId, preferencesCount: response.length || 0 }
  });

  return response;
});

/* --------------------- Notifications Feed / Stats ---------------------------- */

export const getNovuNotificationStats = asyncHandler(async (subscriberId, options = {}) => {
  const response = await novuClient.subscribers.getNotificationsFeed(subscriberId, {
    page: options.page || 0,
    limit: options.limit || 10
  });

  logger.info('Novu notification stats retrieved successfully', {
    meta: { subscriberId, totalCount: response.totalCount || 0 }
  });

  return response;
});

/* ----------------------- Credentials / Device Tokens ------------------------- */

export const updateSubscriberCredentials = asyncHandler(
  async (subscriberId, providerId, credentials) => {
    logger.debug('info', {
      meta: {
        subscriberId,
        providerId,
        credentials
      }
    });
    const response = await novuClient.subscribers.setCredentials(subscriberId, providerId, {
      deviceTokens: ['token1', 'token2']
    });
    return response;
  }
);

export const removeSubscriberCredentials = asyncHandler(async (subscriberId, providerId) => {
  await novuClient.subscribers.deleteCredentials(subscriberId, providerId);

  logger.info('Novu subscriber credentials removed successfully', {
    meta: { subscriberId, providerId }
  });
});

export const registerDeviceToken = asyncHandler(async (subscriberId, deviceData) => {
  const response = await novuClient.subscribers.setCredentials(
    subscriberId,
    deviceData.providerId,
    { deviceTokens: [deviceData.token], ...deviceData.credentials }
  );

  logger.info('Device token registered successfully', {
    meta: { subscriberId, deviceType: deviceData.deviceType, providerId: deviceData.providerId }
  });

  return response;
});

export const removeDeviceToken = asyncHandler(async (subscriberId, providerId) => {
  await novuClient.subscribers.deleteCredentials(subscriberId, providerId);

  logger.info('Device token removed successfully', {
    meta: { subscriberId, providerId }
  });
});

/* ------------------------------ Workflow Mgmt ------------------------------- */

export const getWorkflows = asyncHandler(async (options = {}) => {
  const response = await novuClient.workflows.list({
    page: options.page || 0,
    limit: options.limit || 10
  });

  logger.info('Novu workflows retrieved successfully', {
    meta: { totalCount: response.totalCount || 0 }
  });

  return response;
});

export const getWorkflow = asyncHandler(async (workflowId) => {
  const response = await novuClient.workflows.get(workflowId);

  logger.info('Novu workflow retrieved successfully', {
    meta: { workflowId, name: response.name }
  });

  return response;
});

export const updateWorkflow = asyncHandler(async (workflowId, updates) => {
  const response = await novuClient.workflows.update(workflowId, updates);

  logger.info('Novu workflow updated successfully', {
    meta: { workflowId, name: updates.name }
  });

  return response;
});

/* ------------------------------ Message Ops -------------------------------- */

export const getMessages = asyncHandler(async (options = {}) => {
  const response = await novuClient.messages.list({
    page: options.page || 0,
    limit: options.limit || 10,
    channel: options.channel,
    subscriberId: options.subscriberId,
    transactionId: options.transactionId
  });

  logger.info('Novu messages retrieved successfully', {
    meta: { totalCount: response.totalCount || 0, channel: options.channel }
  });

  return response;
});

export const deleteMessage = asyncHandler(async (messageId) => {
  await novuClient.messages.delete(messageId);

  logger.info('Novu message deleted successfully', { meta: { messageId } });
});

/* ---------------------------- Notification Ops ------------------------------ */

export const getNotifications = asyncHandler(async (options = {}) => {
  const response = await novuClient.notifications.list({
    page: options.page || 0,
    limit: options.limit || 10,
    channels: options.channels,
    templates: options.templates,
    emails: options.emails,
    search: options.search
  });

  logger.info('Novu notifications retrieved successfully', {
    meta: { totalCount: response.totalCount || 0 }
  });

  return response;
});

export const getNotification = asyncHandler(async (notificationId) => {
  const response = await novuClient.notifications.get(notificationId);

  logger.info('Novu notification retrieved successfully', {
    meta: { notificationId, status: response.status }
  });

  return response;
});

/* ------------------------------ Topic Ops ---------------------------------- */

export const createTopic = asyncHandler(async (topicData) => {
  const response = await novuClient.topics.create({
    key: topicData.key,
    name: topicData.name
  });

  logger.info('Novu topic created successfully', {
    meta: { topicKey: topicData.key, topicName: topicData.name }
  });

  return response;
});

export const addSubscriberToTopic = asyncHandler(async (topicKey, subscriberId) => {
  const response = await novuClient.topics.addSubscribers(topicKey, {
    subscribers: [subscriberId]
  });

  logger.info('Subscriber added to topic successfully', { meta: { topicKey, subscriberId } });

  return response;
});

export const removeSubscriberFromTopic = asyncHandler(async (topicKey, subscriberId) => {
  await novuClient.topics.removeSubscribers(topicKey, { subscribers: [subscriberId] });

  logger.info('Subscriber removed from topic successfully', { meta: { topicKey, subscriberId } });
});

/* --------------------------- Bulk Trigger Ops ------------------------------- */

export const triggerBulkWorkflows = asyncHandler(async (workflowsData) => {
  const responses = await Promise.allSettled(
    workflowsData.map((workflowData) =>
      novuClient.trigger(workflowData.name, {
        to: workflowData.to,
        payload: workflowData.payload || {},
        overrides: workflowData.overrides || {}
      })
    )
  );

  const results = responses.map((response, index) => ({
    userId: workflowsData[index].to.subscriberId,
    status: response.status === 'fulfilled' ? 'success' : 'failed',
    transactionId: response.status === 'fulfilled' ? response.value.transactionId : null,
    error: response.status === 'rejected' ? response.reason.message : null
  }));

  const successCount = results.filter((r) => r.status === 'success').length;
  const failureCount = results.filter((r) => r.status === 'failed').length;

  logger.info('Bulk workflows triggered', {
    meta: { totalCount: workflowsData.length, successCount, failureCount }
  });

  return { processedCount: workflowsData.length, successCount, failureCount, results };
});

/* ------------------------- Environment & Integrations ----------------------- */

export const getCurrentEnvironment = asyncHandler(async () => {
  const response = await novuClient.environments.getCurrent();

  logger.info('Current environment retrieved successfully', {
    meta: { environmentId: response._id, name: response.name }
  });

  return response;
});

export const getIntegrations = asyncHandler(async () => {
  const response = await novuClient.integrations.list();

  logger.info('Integrations retrieved successfully', {
    meta: { totalCount: response.length || 0 }
  });

  return response;
});

export const getActiveIntegrations = asyncHandler(async () => {
  const response = await novuClient.integrations.getActive();

  logger.info('Active integrations retrieved successfully', {
    meta: { totalCount: response.length || 0 }
  });

  return response;
});

/* ------------------------- Notification History Ops ------------------------- */

export const getNotificationHistory = asyncHandler(async (subscriberId, options = {}) => {
  const response = await novuClient.subscribers.getNotificationsFeed(subscriberId, {
    page: options.page || 0,
    limit: options.limit || 20,
    seen: options.seen,
    read: options.read
  });

  logger.info('Notification history retrieved successfully', {
    meta: { subscriberId, totalCount: response.totalCount || 0, page: options.page || 0 }
  });

  return response;
});

/* ----------------------- Mark Read / Seen Operations ------------------------ */

export const markNotificationAsRead = asyncHandler(async (subscriberId, messageId) => {
  const response = await novuClient.subscribers.markMessageRead(subscriberId, messageId);

  logger.info('Notification marked as read', { meta: { subscriberId, messageId } });

  return response;
});

export const markNotificationAsSeen = asyncHandler(async (subscriberId, messageId) => {
  const response = await novuClient.subscribers.markMessageSeen(subscriberId, messageId);

  logger.info('Notification marked as seen', { meta: { subscriberId, messageId } });

  return response;
});

export const markAllNotificationsAsRead = asyncHandler(async (subscriberId) => {
  const response = await novuClient.subscribers.markAllMessagesRead(subscriberId);

  logger.info('All notifications marked as read', { meta: { subscriberId } });

  return response;
});

export const markAllNotificationsAsSeen = asyncHandler(async (subscriberId) => {
  const response = await novuClient.subscribers.markAllMessagesSeen(subscriberId);

  logger.info('All notifications marked as seen', { meta: { subscriberId } });

  return response;
});
