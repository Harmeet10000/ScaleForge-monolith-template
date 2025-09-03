import * as AuthMessagingService from './authMessagingService.js';
import * as BaseService from '../core/baseService.js';
import * as MessageBroker from '../core/messageBroker.js';
import { logger } from '../../../utils/logger.js';
import { httpError } from '../../../utils/httpError.js';
import asyncHandler from 'express-async-handler';

/**
 * Functional Auth Consumer - Pure functions for consuming auth events
 * No classes, just composable functions for background message processing
 */

// ==================== CONSUMER STATE MANAGEMENT ====================

/**
 * Create consumer state
 */
export const createConsumerState = () => ({
  initialized: false,
  isRunning: false,
  serviceState: null,
  consumers: [],
  metrics: {
    messagesProcessed: 0,
    messagesErrored: 0,
    lastProcessedAt: null,
    startedAt: null
  }
});

/**
 * Update consumer state immutably
 */
const updateConsumerState = (state, updates) => ({
  ...state,
  ...updates
});

/**
 * Update consumer metrics
 */
const updateMetrics = (state, updates) => ({
  ...state,
  metrics: {
    ...state.metrics,
    ...updates
  }
});

/**
 * Initialize consumer
 */
const initializeConsumer = asyncHandler(async (consumerState) => {
  if (consumerState.initialized) return consumerState;

  const serviceState = await AuthMessagingService.initializeAuthService();

  logger.info('Auth Consumer initialized');

  return updateConsumerState(consumerState, {
    initialized: true,
    serviceState
  });
});

/**
 * Ensure consumer is initialized
 */
const ensureInitialized = asyncHandler(async (consumerState) => {
  return consumerState.initialized ? consumerState : await initializeConsumer(consumerState);
});

// ==================== CONSUMER MANAGEMENT ====================

/**
 * Start all auth consumers
 */
export const startConsumers = asyncHandler(async (consumerState) => {
  if (consumerState.isRunning) {
    logger.warn('Auth consumers are already running');
    return consumerState;
  }

  const state = await ensureInitialized(consumerState);

  const { consumers, state: newServiceState } = await AuthMessagingService.startAuthConsumers(state.serviceState);

  const updatedState = updateConsumerState(state, {
    isRunning: true,
    serviceState: newServiceState,
    consumers: consumers.map(c => ({
      consumerTag: c.consumerTag,
      queue: c.queue || 'unknown'
    }))
  });

  const finalState = updateMetrics(updatedState, {
    startedAt: new Date().toISOString()
  });

  logger.info('All auth consumers started successfully', {
    meta: {
      consumerCount: consumers.length,
      consumerTags: consumers.map(c => c.consumerTag)
    }
  });

  return finalState;
});

/**
 * Stop all consumers gracefully
 */
export const stopConsumers = asyncHandler(async (consumerState) => {
  if (!consumerState.isRunning) {
    logger.info('Auth consumers are not running');
    return consumerState;
  }

  logger.info('Stopping auth consumers...');

  // Cancel all consumers
  for (const consumer of consumerState.consumers) {
    const result = await cancelConsumer(consumerState, consumer.consumerTag).catch((error) => {
      logger.warn(`Error cancelling consumer ${consumer.consumerTag}:`, error.message);
    });
  }

  const updatedState = updateConsumerState(consumerState, {
    isRunning: false,
    consumers: []
  });

  logger.info('All auth consumers stopped successfully');
  return updatedState;
});

/**
 * Cancel individual consumer
 */
const cancelConsumer = asyncHandler(async (consumerState, consumerTag) => {
  const { channel } = await MessageBroker.getChannel(consumerState.serviceState.brokerState);
  await channel.cancel(consumerTag);
  logger.debug(`Consumer ${consumerTag} cancelled`);
});

/**
 * Restart consumers
 */
export const restartConsumers = asyncHandler(async (consumerState) => {
  logger.info('Restarting auth consumers...');

  const stoppedState = await stopConsumers(consumerState);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause
  const startedState = await startConsumers(stoppedState);

  logger.info('Auth consumers restarted successfully');
  return startedState;
});

/**
 * Pause consumers (stop processing but keep connections)
 */
export const pauseConsumers = asyncHandler(async (consumerState) => {
  if (!consumerState.isRunning) {
    logger.warn('Consumers are not running');
    return consumerState;
  }

  logger.info('Pausing auth consumers...');

  for (const consumer of consumerState.consumers) {
    await cancelConsumer(consumerState, consumer.consumerTag).catch((error) => {
      logger.warn(`Error pausing consumer ${consumer.consumerTag}:`, error.message);
    });
  }

  const updatedState = updateConsumerState(consumerState, {
    isRunning: false
  });

  logger.info('Auth consumers paused successfully');
  return updatedState;
});

/**
 * Resume consumers (restart processing)
 */
export const resumeConsumers = asyncHandler(async (consumerState) => {
  if (consumerState.isRunning) {
    logger.warn('Consumers are already running');
    return consumerState;
  }

  logger.info('Resuming auth consumers...');
  const resumedState = await startConsumers(consumerState);
  logger.info('Auth consumers resumed successfully');
  return resumedState;
});

// ==================== MESSAGE PROCESSING ====================

/**
 * Process a single message manually (for testing/debugging)
 */
export const processMessage = asyncHandler(async (consumerState, messageType, messageData, metadata = {}) => {
  const state = await ensureInitialized(consumerState);

  const handler = state.serviceState.handlers.get(messageType);
  if (!handler) {
    const error = new Error(`No handler found for message type: ${messageType}`);
    throw error;
  }

  logger.info('Processing message manually', {
    meta: { messageType, messageId: metadata.messageId || 'manual' }
  });

  await handler.handler(messageData, metadata);

  const updatedState = updateMetrics(state, {
    messagesProcessed: state.metrics.messagesProcessed + 1,
    lastProcessedAt: new Date().toISOString()
  });

  logger.info('Message processed successfully', {
    meta: { messageType, messageId: metadata.messageId || 'manual' }
  });

  return { success: true, state: updatedState };
});

/**
 * Process multiple messages in batch
 */
export const processBatch = asyncHandler(async (consumerState, messages) => {
  const state = await ensureInitialized(consumerState);

  const results = [];
  let currentState = state;

  for (const { messageType, messageData, metadata = {} } of messages) {
    const result = await processMessage(currentState, messageType, messageData, metadata)
      .then((res) => ({
        messageType,
        messageId: metadata.messageId || 'batch',
        success: true,
        error: null
      }))
      .catch((error) => {
        const updatedState = updateMetrics(currentState, {
          messagesErrored: currentState.metrics.messagesErrored + 1,
          lastProcessedAt: new Date().toISOString()
        });
        currentState = updatedState;

        return {
          messageType,
          messageId: metadata.messageId || 'batch',
          success: false,
          error: error.message
        };
      });

    results.push(result);
    if (result.success && result.state) {
      currentState = result.state;
    }
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  logger.info('Batch message processing completed', {
    meta: {
      totalMessages: messages.length,
      successful,
      failed
    }
  });

  return { results, successful, failed, state: currentState };
});

// ==================== MONITORING AND METRICS ====================

/**
 * Get consumer status
 */
export const getStatus = (consumerState) => ({
  initialized: consumerState.initialized,
  isRunning: consumerState.isRunning,
  consumerCount: consumerState.consumers.length,
  consumers: consumerState.consumers.map(c => ({
    consumerTag: c.consumerTag,
    queue: c.queue
  })),
  metrics: consumerState.metrics
});

/**
 * Get consumer metrics
 */
export const getMetrics = asyncHandler(async (consumerState) => {
  if (!consumerState.isRunning) {
    return {
      status: 'stopped',
      metrics: consumerState.metrics
    };
  }

  // Get queue information for all auth queues
  const { channel } = await MessageBroker.getChannel(consumerState.serviceState.brokerState);
  const queueMetrics = [];

  const authQueues = [
    'auth.user.registered',
    'auth.user.login',
    'auth.user.logout',
    'auth.password.reset.requested',
    'auth.password.reset.completed',
    'auth.account.confirmed',
    'auth.security.suspicious.activity',
    'auth.account.locked'
  ];

  for (const queueName of authQueues) {
    const queueInfo = await channel.checkQueue(queueName).catch(() => ({
      messageCount: 0,
      consumerCount: 0,
      error: 'Queue not found'
    }));

    queueMetrics.push({
      queue: queueName,
      messageCount: queueInfo.messageCount || 0,
      consumerCount: queueInfo.consumerCount || 0,
      error: queueInfo.error || null
    });
  }

  return {
    status: 'running',
    consumerCount: consumerState.consumers.length,
    queues: queueMetrics,
    metrics: consumerState.metrics,
    timestamp: new Date().toISOString()
  };
});

/**
 * Health check for consumers
 */
export const healthCheck = asyncHandler(async (consumerState) => {
  const state = await ensureInitialized(consumerState);
  const serviceHealth = await AuthMessagingService.authServiceHealthCheck(state.serviceState);
  const status = getStatus(state);

  return {
    status: state.isRunning ? 'healthy' : 'stopped',
    consumer: 'auth',
    ...status,
    service: serviceHealth
  };
});

/**
 * Check message backlog and alert if necessary
 */
export const checkMessageBacklog = asyncHandler(async (consumerState, threshold = 100) => {
  const metrics = await getMetrics(consumerState);
  const alerts = [];

  for (const queue of metrics.queues || []) {
    if (queue.messageCount > threshold) {
      const alert = {
        type: 'high_backlog',
        queue: queue.queue,
        messageCount: queue.messageCount,
        threshold,
        timestamp: new Date().toISOString()
      };

      alerts.push(alert);

      logger.warn('High message queue backlog detected', {
        queue: queue.queue,
        messageCount: queue.messageCount,
        threshold
      });
    }
  }

  return {
    alerts,
    hasAlerts: alerts.length > 0,
    totalQueues: metrics.queues?.length || 0,
    timestamp: new Date().toISOString()
  };
});

// ==================== HIGHER-ORDER FUNCTIONS ====================

/**
 * Create a consumer manager
 */
export const createConsumerManager = (consumerState) => ({
  start: () => startConsumers(consumerState),
  stop: () => stopConsumers(consumerState),
  restart: () => restartConsumers(consumerState),
  pause: () => pauseConsumers(consumerState),
  resume: () => resumeConsumers(consumerState),
  getStatus: () => getStatus(consumerState),
  getMetrics: () => getMetrics(consumerState),
  healthCheck: () => healthCheck(consumerState),
  processMessage: (messageType, messageData, metadata) =>
    processMessage(consumerState, messageType, messageData, metadata),
  processBatch: (messages) => processBatch(consumerState, messages),
  checkBacklog: (threshold) => checkMessageBacklog(consumerState, threshold)
});

/**
 * Create a monitored consumer that tracks metrics
 */
export const createMonitoredConsumer = (consumerState) => {
  const manager = createConsumerManager(consumerState);

  return {
    ...manager,
    processMessage: async (messageType, messageData, metadata) => {
      return BaseService.logFunctionExecution(manager.processMessage, 'info', messageType, messageData, metadata);
    },
    processBatch: async (messages) => {
      return BaseService.logFunctionExecution(manager.processBatch, 'info', messages);
    }
  };
};

/**
 * Create a resilient consumer with automatic restart
 */
export const createResilientConsumer = (consumerState, maxRestarts = 3, restartDelay = 5000) => {
  const manager = createConsumerManager(consumerState);
  let restartCount = 0;

  const resilientStart = asyncHandler(async () => {
    if (restartCount < maxRestarts) {
      const result = await manager.start().catch(async (error) => {
        restartCount++;
        logger.warn(`Consumer start failed, retrying (${restartCount}/${maxRestarts})`, {
          error: error.message
        });

        await new Promise(resolve => setTimeout(resolve, restartDelay));
        return resilientStart();
      });

      return result;
    }

    logger.error('Max restart attempts reached');
    throw new Error('Max restart attempts reached');
  });

  const resilientRestart = async () => {
    return BaseService.retryOperation(manager.restart, maxRestarts, restartDelay);
  };

  return {
    ...manager,
    start: resilientStart,
    restart: resilientRestart
  };
};

// ==================== FUNCTIONAL COMPOSITION ====================

/**
 * Compose consumer operations
 */
export const composeConsumerOperations = (...operations) =>
  asyncHandler(async (consumerState) => {
    let currentState = consumerState;

    for (const operation of operations) {
      currentState = await operation(currentState);
    }

    return currentState;
  });

/**
 * Create a consumer pipeline
 */
export const createConsumerPipeline = (...operations) =>
  MessageBroker.pipe(...operations);

/**
 * Add automatic metrics collection to any consumer operation
 */
export const withMetricsCollection = (operation) =>
  asyncHandler(async (consumerState, ...args) => {
    const startTime = Date.now();

    const result = await operation(consumerState, ...args);
    const duration = Date.now() - startTime;

    logger.info('Consumer operation completed', {
      meta: {
        operation: operation.name,
        duration,
        success: true
      }
    });

    return result;
  });

// ==================== GRACEFUL SHUTDOWN ====================

/**
 * Setup graceful shutdown handlers
 */
export const setupShutdownHandlers = (consumerState) => {
  const gracefulShutdown = asyncHandler(async (signal) => {
    logger.info(`${signal} received. Shutting down auth consumers gracefully...`);

    await stopConsumers(consumerState).catch((error) => {
      logger.error('Error during auth consumers shutdown', {
        meta: { error: error.message }
      });
    });

    logger.info('Auth consumers shutdown completed');
  });

  // Handle different shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

  return consumerState;
};

// ==================== MONADIC ERROR HANDLING ====================

/**
 * Safe consumer operations using Result monad
 */
export const safeStartConsumers = BaseService.safeAsync(startConsumers);
export const safeStopConsumers = BaseService.safeAsync(stopConsumers);
export const safeRestartConsumers = BaseService.safeAsync(restartConsumers);
export const safeProcessMessage = BaseService.safeAsync(processMessage);
export const safeProcessBatch = BaseService.safeAsync(processBatch);

/**
 * Chain safe consumer operations
 */
export const chainSafeConsumerOps = (...operations) =>
  asyncHandler(async (consumerState) => {
    let currentResult = BaseService.Result.ok(consumerState);

    for (const operation of operations) {
      currentResult = await BaseService.Result.flatMap(operation)(currentResult);
      if (!currentResult.success) break;
    }

    return currentResult;
  });

// ==================== SINGLETON STATE MANAGEMENT ====================

/**
 * Global consumer state (mutable for singleton pattern)
 */
let globalConsumerState = createConsumerState();

/**
 * Get global consumer state
 */
export const getGlobalConsumerState = () => globalConsumerState;

/**
 * Update global consumer state
 */
export const updateGlobalConsumerState = (updates) => {
  globalConsumerState = { ...globalConsumerState, ...updates };
  return globalConsumerState;
};

/**
 * Reset global consumer state
 */
export const resetGlobalConsumerState = () => {
  globalConsumerState = createConsumerState();
  return globalConsumerState;
};

// ==================== CONVENIENCE FUNCTIONS ====================

/**
 * Quick consumer operations using global state
 */
export const quickStartConsumers = asyncHandler(async () => startConsumers(globalConsumerState));
export const quickStopConsumers = asyncHandler(async () => stopConsumers(globalConsumerState));
export const quickRestartConsumers = asyncHandler(async () => restartConsumers(globalConsumerState));
export const quickGetStatus = () => getStatus(globalConsumerState);
export const quickGetMetrics = asyncHandler(async () => getMetrics(globalConsumerState));
export const quickHealthCheck = asyncHandler(async () => healthCheck(globalConsumerState));

/**
 * Create global consumer manager instance
 */
export const globalAuthConsumerManager = createConsumerManager(globalConsumerState);

/**
 * Setup global consumer with shutdown handlers
 */
export const setupGlobalConsumer = () => {
  setupShutdownHandlers(globalConsumerState);
  return globalAuthConsumerManager;
};