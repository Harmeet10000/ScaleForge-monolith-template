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
      transactionId: response.data.transactionId
    }
  });

  return response.data;
});

export const broadcastWorkflow = asyncHandler(async (broadcastData) => {
  const response = await novuClient.trigger(broadcastData.name, {
    to: [{ type: 'Broadcast' }],
    payload: broadcastData.payload || {},
    overrides: broadcastData.overrides || {}
  });

  logger.info('Novu workflow broadcasted successfully', {
    meta: {
      workflowName: broadcastData.name,
      transactionId: response.data.transactionId
    }
  });

  return response.data;
});

export const triggerWorkflowWithActor = asyncHandler(async (workflowData, actor) => {
  const response = await novuClient.trigger(workflowData.name, {
    to: workflowData.to,
    payload: workflowData.payload || {},
    overrides: workflowData.overrides || {},
    actor
  });

  logger.info('Workflow triggered with actor', {
    meta: {
      workflowName: workflowData.name,
      subscriberId: workflowData.to.subscriberId,
      actor: actor?.subscriberId,
      transactionId: response.data.transactionId
    }
  });

  return response.data;
});

export const triggerWorkflowToTopic = asyncHandler(async (workflowName, topicKey, payload = {}) => {
  const response = await novuClient.trigger(workflowName, {
    to: [{ type: 'Topic', topicKey }],
    payload
  });

  logger.info('Workflow triggered to topic', {
    meta: { workflowName, topicKey, transactionId: response.data.transactionId }
  });

  return response.data;
});

export const triggerWorkflowWithDelay = asyncHandler(async (workflowData, delayOptions) => {
  const response = await novuClient.trigger(workflowData.name, {
    to: workflowData.to,
    payload: workflowData.payload || {},
    overrides: {
      ...workflowData.overrides,
      delay: {
        amount: delayOptions.amount,
        unit: delayOptions.unit
      }
    }
  });

  logger.info('Workflow triggered with delay', {
    meta: {
      workflowName: workflowData.name,
      subscriberId: workflowData.to.subscriberId,
      delay: delayOptions,
      transactionId: response.data.transactionId
    }
  });

  return response.data;
});

export const bulkTriggerEvents = asyncHandler(async (events) => {
  const response = await novuClient.bulkTrigger(events);

  logger.info('Bulk events triggered', {
    meta: { count: events.length }
  });

  return response.data;
});

/* ---------------------------- Subscriber Operations --------------------------- */

export const createNovuSubscriber = asyncHandler(async (subscriberData) => {
  const response = await novuClient.subscribers.identify(subscriberData.subscriberId, {
    email: subscriberData.email,
    firstName: subscriberData.firstName,
    lastName: subscriberData.lastName,
    phone: subscriberData.phone,
    avatar: subscriberData.avatar,
    locale: subscriberData.locale,
    data: subscriberData.data || {}
  });

  logger.info('Novu subscriber created/updated successfully', {
    meta: { subscriberId: subscriberData.subscriberId, email: subscriberData.email }
  });

  return response.data;
});

export const updateNovuSubscriber = asyncHandler(async (subscriberId, updates) => {
  const response = await novuClient.subscribers.update(subscriberId, updates);

  logger.info('Novu subscriber updated successfully', { meta: { subscriberId } });

  return response.data;
});

export const deleteNovuSubscriber = asyncHandler(async (subscriberId) => {
  await novuClient.subscribers.delete(subscriberId);

  logger.info('Novu subscriber deleted successfully', { meta: { subscriberId } });
});

export const getNovuSubscriber = asyncHandler(async (subscriberId) => {
  const response = await novuClient.subscribers.get(subscriberId);

  logger.info('Novu subscriber retrieved successfully', {
    meta: { subscriberId, email: response.data?.email }
  });

  return response.data;
});

export const updateSubscriberOnlineStatus = asyncHandler(async (subscriberId, isOnline) => {
  const response = await novuClient.subscribers.updateOnlineFlag(subscriberId, isOnline);

  logger.info('Subscriber online status updated', {
    meta: { subscriberId, isOnline }
  });

  return response.data;
});

export const bulkCreateSubscribers = asyncHandler(async (subscribersData) => {
  const results = await Promise.allSettled(
    subscribersData.map((subscriber) => createNovuSubscriber(subscriber))
  );

  const successCount = results.filter((r) => r.status === 'fulfilled').length;
  const failureCount = results.filter((r) => r.status === 'rejected').length;

  logger.info('Bulk subscribers created', {
    meta: { total: subscribersData.length, successCount, failureCount }
  });

  return {
    successCount,
    failureCount,
    results: results.map((r, index) => ({
      subscriberId: subscribersData[index].subscriberId,
      status: r.status === 'fulfilled' ? 'success' : 'failed',
      error: r.status === 'rejected' ? r.reason.message : null
    }))
  };
});

export const bulkDeleteSubscribers = asyncHandler(async (subscriberIds) => {
  const results = await Promise.allSettled(subscriberIds.map((id) => deleteNovuSubscriber(id)));

  const successCount = results.filter((r) => r.status === 'fulfilled').length;
  const failureCount = results.filter((r) => r.status === 'rejected').length;

  logger.info('Bulk subscribers deleted', {
    meta: { total: subscriberIds.length, successCount, failureCount }
  });

  return {
    successCount,
    failureCount,
    results: results.map((r, index) => ({
      subscriberId: subscriberIds[index],
      status: r.status === 'fulfilled' ? 'success' : 'failed',
      error: r.status === 'rejected' ? r.reason.message : null
    }))
  };
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

  return response.data;
});

export const getNovuSubscriberPreferences = asyncHandler(async (subscriberId) => {
  const response = await novuClient.subscribers.getPreference(subscriberId);

  logger.info('Novu subscriber preferences retrieved successfully', {
    meta: { subscriberId, preferencesCount: response.data?.length || 0 }
  });

  return response.data;
});

export const getWorkflowOverrides = asyncHandler(async (subscriberId) => {
  const response = await novuClient.subscribers.getPreference(subscriberId);

  const overrides = response.data?.filter((pref) => pref.template?.critical === false);

  logger.info('Workflow overrides retrieved', {
    meta: { subscriberId, count: overrides?.length || 0 }
  });

  return overrides;
});

/* --------------------- Notifications Feed / Stats ---------------------------- */

export const getNovuNotificationFeed = asyncHandler(async (subscriberId, options = {}) => {
  const response = await novuClient.subscribers.getNotificationsFeed(subscriberId, {
    page: options.page || 0,
    limit: options.limit || 10,
    feedIdentifier: options.feedIdentifier
  });

  logger.info('Novu notification feed retrieved successfully', {
    meta: { subscriberId, totalCount: response.data?.totalCount || 0 }
  });

  return response.data;
});

export const getUnseenCount = asyncHandler(async (subscriberId, seen) => {
  const response = await novuClient.subscribers.getUnseenCount(subscriberId, seen);

  logger.info('Unseen notification count retrieved', {
    meta: { subscriberId, count: response.data?.count || 0 }
  });

  return response.data;
});

export const removeMessage = asyncHandler(async (subscriberId, messageId) => {
  const response = await novuClient.subscribers.removeMessage(subscriberId, messageId);

  logger.info('Message removed from feed', { meta: { subscriberId, messageId } });

  return response.data;
});

export const getMessageById = asyncHandler(async (subscriberId, messageId) => {
  const response = await novuClient.subscribers.getMessage(subscriberId, messageId);

  logger.info('Message retrieved', { meta: { subscriberId, messageId } });

  return response.data;
});

/* ----------------------- Credentials / Device Tokens ------------------------- */

export const updateSubscriberCredentials = asyncHandler(
  async (subscriberId, providerId, credentials) => {
    const response = await novuClient.subscribers.setCredentials(
      subscriberId,
      providerId,
      credentials
    );

    logger.info('Subscriber credentials updated successfully', {
      meta: { subscriberId, providerId }
    });

    return response.data;
  }
);

export const removeSubscriberCredentials = asyncHandler(async (subscriberId, providerId) => {
  await novuClient.subscribers.deleteCredentials(subscriberId, providerId);

  logger.info('Subscriber credentials removed successfully', {
    meta: { subscriberId, providerId }
  });
});

export const registerDeviceToken = asyncHandler(async (subscriberId, deviceData) => {
  const response = await novuClient.subscribers.setCredentials(
    subscriberId,
    deviceData.providerId,
    {
      deviceTokens: [deviceData.token]
    }
  );

  logger.info('Device token registered successfully', {
    meta: { subscriberId, deviceType: deviceData.deviceType, providerId: deviceData.providerId }
  });

  return response.data;
});

export const removeDeviceToken = asyncHandler(async (subscriberId, providerId) => {
  await novuClient.subscribers.deleteCredentials(subscriberId, providerId);

  logger.info('Device token removed successfully', {
    meta: { subscriberId, providerId }
  });
});

/* ------------------------------ Topic Operations ---------------------------------- */

export const createTopic = asyncHandler(async (topicData) => {
  const response = await novuClient.topics.create({
    key: topicData.key,
    name: topicData.name
  });

  logger.info('Novu topic created successfully', {
    meta: { topicKey: topicData.key, topicName: topicData.name }
  });

  return response.data;
});

export const addSubscribersToTopic = asyncHandler(async (topicKey, subscriberIds) => {
  const subscribers = Array.isArray(subscriberIds) ? subscriberIds : [subscriberIds];
  const response = await novuClient.topics.addSubscribers(topicKey, { subscribers });

  logger.info('Subscribers added to topic successfully', {
    meta: { topicKey, count: subscribers.length }
  });

  return response.data;
});

export const removeSubscribersFromTopic = asyncHandler(async (topicKey, subscriberIds) => {
  const subscribers = Array.isArray(subscriberIds) ? subscriberIds : [subscriberIds];
  await novuClient.topics.removeSubscribers(topicKey, { subscribers });

  logger.info('Subscribers removed from topic successfully', {
    meta: { topicKey, count: subscribers.length }
  });
});

export const renameTopic = asyncHandler(async (topicKey, newName) => {
  const response = await novuClient.topics.rename(topicKey, newName);

  logger.info('Topic renamed successfully', { meta: { topicKey, newName } });

  return response.data;
});

/* --------------------------- Bulk Trigger Operations ------------------------------- */

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
    subscriberId: workflowsData[index].to.subscriberId,
    workflowName: workflowsData[index].name,
    status: response.status === 'fulfilled' ? 'success' : 'failed',
    transactionId: response.status === 'fulfilled' ? response.value.data?.transactionId : null,
    error: response.status === 'rejected' ? response.reason.message : null
  }));

  const successCount = results.filter((r) => r.status === 'success').length;
  const failureCount = results.filter((r) => r.status === 'failed').length;

  logger.info('Bulk workflows triggered', {
    meta: { totalCount: workflowsData.length, successCount, failureCount }
  });

  return { processedCount: workflowsData.length, successCount, failureCount, results };
});

export const triggerToMultipleSubscribers = asyncHandler(
  async (workflowName, recipients, commonPayload = {}) => {
    const workflowsData = recipients.map((recipient) => ({
      name: workflowName,
      to: recipient,
      payload: { ...commonPayload, ...recipient.customPayload }
    }));

    return triggerBulkWorkflows(workflowsData);
  }
);

/* ----------------------- Mark Read / Seen Operations ------------------------ */

export const markMessageAsRead = asyncHandler(async (subscriberId, messageId) => {
  const response = await novuClient.subscribers.markMessageAs(subscriberId, messageId, {
    read: true
  });

  logger.info('Message marked as read', { meta: { subscriberId, messageId } });

  return response.data;
});

export const markMessageAsSeen = asyncHandler(async (subscriberId, messageId) => {
  const response = await novuClient.subscribers.markMessageAs(subscriberId, messageId, {
    seen: true
  });

  logger.info('Message marked as seen', { meta: { subscriberId, messageId } });

  return response.data;
});

export const markAllMessagesAsRead = asyncHandler(async (subscriberId, feedIdentifier) => {
  const response = await novuClient.subscribers.markAllMessagesAs(subscriberId, {
    read: true,
    feedIdentifier
  });

  logger.info('All messages marked as read', { meta: { subscriberId } });

  return response.data;
});

export const markAllMessagesAsSeen = asyncHandler(async (subscriberId, feedIdentifier) => {
  const response = await novuClient.subscribers.markAllMessagesAs(subscriberId, {
    seen: true,
    feedIdentifier
  });

  logger.info('All messages marked as seen', { meta: { subscriberId } });

  return response.data;
});

/* ----------------------- Cancel / Delete Operations ------------------------ */

export const cancelTriggeredEvent = asyncHandler(async (transactionId) => {
  const response = await novuClient.events.cancel(transactionId);

  logger.info('Triggered event cancelled', { meta: { transactionId } });

  return response.data;
});

/* ------------------------------ Tenant Operations ---------------------------------- */

export const createTenant = asyncHandler(async (tenantData) => {
  const response = await novuClient.tenants.create({
    identifier: tenantData.identifier,
    name: tenantData.name,
    data: tenantData.data || {}
  });

  logger.info('Tenant created', { meta: { identifier: tenantData.identifier } });

  return response.data;
});

export const updateTenant = asyncHandler(async (identifier, updates) => {
  const response = await novuClient.tenants.update(identifier, updates);

  logger.info('Tenant updated', { meta: { identifier } });

  return response.data;
});

export const deleteTenant = asyncHandler(async (identifier) => {
  await novuClient.tenants.delete(identifier);

  logger.info('Tenant deleted', { meta: { identifier } });
});

export const getTenant = asyncHandler(async (identifier) => {
  const response = await novuClient.tenants.get(identifier);

  logger.info('Tenant retrieved', { meta: { identifier } });

  return response.data;
});

export const listTenants = asyncHandler(async (options = {}) => {
  const response = await novuClient.tenants.list({
    page: options.page || 0,
    limit: options.limit || 10
  });

  logger.info('Tenants listed', {
    meta: { totalCount: response.data?.totalCount || 0 }
  });

  return response.data;
});

/* ------------------------------ Layout Operations ---------------------------------- */

export const getLayouts = asyncHandler(async (options = {}) => {
  const response = await novuClient.layouts.list({
    page: options.page || 0,
    pageSize: options.pageSize || 10
  });

  logger.info('Layouts retrieved', { meta: { count: response.data?.length || 0 } });

  return response.data;
});

export const getLayout = asyncHandler(async (layoutId) => {
  const response = await novuClient.layouts.get(layoutId);

  logger.info('Layout retrieved', { meta: { layoutId } });

  return response.data;
});

/* ------------------------------ Feed Operations ---------------------------------- */

export const createFeed = asyncHandler(async (feedName) => {
  const response = await novuClient.feeds.create({ name: feedName });

  logger.info('Feed created', { meta: { feedName } });

  return response.data;
});

export const deleteFeed = asyncHandler(async (feedId) => {
  await novuClient.feeds.delete(feedId);

  logger.info('Feed deleted', { meta: { feedId } });
});

/* ------------------------------ Utility Functions ---------------------------------- */

export const verifyNovuWebhook = (signature, payload, secret) => {
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(JSON.stringify(payload)).digest('hex');

  const isValid = signature === digest;

  logger.info('Webhook verification', { meta: { isValid } });

  return isValid;
};
