import * as MessageBroker from './messageBroker.js';
import { logger } from '../../../utils/logger.js';
import { httpError } from '../../../utils/httpError.js';
import asyncHandler from 'express-async-handler';
import Joi from 'joi';

/**
 * Functional Base Service - Pure functions for domain messaging
 * No classes, just composable functions and immutable state
 */

// ==================== SERVICE STATE MANAGEMENT ====================

/**
 * Create service state
 */
export const createServiceState = (serviceName, config = {}) => ({
  serviceName,
  config: {
    exchangeName: config.exchangeName || `${serviceName}.exchange`,
    exchangeType: config.exchangeType || 'topic',
    queuePrefix: config.queuePrefix || serviceName,
    routingKeyPrefix: config.routingKeyPrefix || serviceName,
    ...config
  },
  brokerState: MessageBroker.defaultBrokerState,
  schemas: new Map(),
  handlers: new Map(),
  initialized: false
});

/**
 * Update service state immutably
 */
const updateServiceState = (state, updates) => ({
  ...state,
  ...updates
});

/**
 * Add schema to service state
 */
export const addSchema = (state, messageType, schema) => {
  const newSchemas = new Map(state.schemas);
  newSchemas.set(messageType, schema);

  logger.debug(`Schema registered for ${state.serviceName}`, {
    meta: { messageType }
  });

  return updateServiceState(state, { schemas: newSchemas });
};

/**
 * Add handler to service state
 */
export const addHandler = (state, messageType, handler, options = {}) => {
  const newHandlers = new Map(state.handlers);
  newHandlers.set(messageType, { handler, options });

  logger.debug(`Handler registered for ${state.serviceName}`, {
    meta: { messageType }
  });

  return updateServiceState(state, { handlers: newHandlers });
};

/**
 * Mark service as initialized
 */
const markInitialized = (state, brokerState) =>
  updateServiceState(state, {
    initialized: true,
    brokerState
  });

// ==================== PURE VALIDATION FUNCTIONS ====================

/**
 * Validate message against schema
 */
export const validateMessage = (state, messageType, data) => {
  const schema = state.schemas.get(messageType);

  if (!schema) {
    logger.warn(`No schema found for message type: ${messageType}`);
    return { value: data, error: null };
  }

  const result = schema.validate(data);

  if (result.error) {
    logger.error(`Message validation failed for ${messageType}`, {
      meta: {
        error: result.error.details,
        data
      }
    });
  }

  return result;
};

/**
 * Create routing key for message type
 */
const createRoutingKey = (state, messageType, customRoutingKey) =>
  customRoutingKey || `${state.config.routingKeyPrefix}.${messageType}`;

/**
 * Create queue name for message type
 */
const createQueueName = (state, messageType, customQueueName) =>
  customQueueName || `${state.config.queuePrefix}.${messageType}`;

/**
 * Create publish options with service context
 */
const createServicePublishOptions = (state, options = {}) => ({
  source: state.serviceName,
  correlationId: options.correlationId,
  priority: options.priority || 0,
  ...options
});

// ==================== INFRASTRUCTURE SETUP ====================

/**
 * Setup service infrastructure (pure function with side effects)
 */
export const setupServiceInfrastructure = asyncHandler(async (state, customSetup = null) => {
  let brokerState = await MessageBroker.ensureExchange(
    state.brokerState,
    state.config.exchangeName,
    state.config.exchangeType
  );

  // Run custom setup if provided
  if (customSetup) {
    brokerState = await customSetup(brokerState, state);
  }

  logger.info(`${state.serviceName} messaging service infrastructure setup completed`, {
    meta: {
      exchangeName: state.config.exchangeName,
      exchangeType: state.config.exchangeType
    }
  });

  return updateServiceState(state, { brokerState });
});

/**
 * Initialize service
 */
export const initializeService = asyncHandler(async (state, customSetup = null) => {
  if (state.initialized) {
    return state;
  }

  const stateWithInfrastructure = await setupServiceInfrastructure(state, customSetup);
  const initializedState = markInitialized(
    stateWithInfrastructure,
    stateWithInfrastructure.brokerState
  );

  logger.info(`${state.serviceName} messaging service initialized`, {
    meta: {
      exchangeName: state.config.exchangeName,
      exchangeType: state.config.exchangeType
    }
  });

  return initializedState;
});

// ==================== MESSAGE PUBLISHING ====================

/**
 * Publish message with validation and routing
 */
export const publishServiceMessage = asyncHandler(
  async (state, messageType, data, options = {}) => {
    const initializedState = state.initialized ? state : await initializeService(state);

    // Validate message
    const validation = validateMessage(initializedState, messageType, data);
    if (validation.error) {
      const error = new Error(`Message validation failed: ${validation.error.message}`);
      throw error;
    }

    const routingKey = createRoutingKey(initializedState, messageType, options.routingKey);
    const publishOptions = createServicePublishOptions(initializedState, options);

    const result = await MessageBroker.publishMessage(
      initializedState.brokerState,
      initializedState.config.exchangeName,
      routingKey,
      validation.value,
      publishOptions
    );

    logger.info(`${initializedState.serviceName} message published`, {
      meta: {
        messageType,
        routingKey,
        messageId: result.messageId
      }
    });

    return { result, state: initializedState };
  }
);

// ==================== CONSUMER SETUP ====================

/**
 * Create message handler wrapper with service context
 */
const createServiceMessageHandler = (state, messageType, handler) =>
  asyncHandler(async (message, rawMsg) => {
    const startTime = Date.now();

    logger.debug(`Processing ${state.serviceName} message`, {
      meta: {
        messageType,
        messageId: message.id,
        correlationId: message.metadata?.correlationId
      }
    });

    await handler(message.data, message.metadata, rawMsg);

    const duration = Date.now() - startTime;
    logger.info(`${state.serviceName} message processed successfully`, {
      meta: {
        messageType,
        messageId: message.id,
        duration
      }
    });
  });

/**
 * Setup consumer for message type
 */
export const setupServiceConsumer = asyncHandler(async (state, messageType, options = {}) => {
  const initializedState = state.initialized ? state : await initializeService(state);

  const queueName = createQueueName(initializedState, messageType, options.queueName);
  const routingKey = createRoutingKey(initializedState, messageType, options.routingKey);

  // Ensure queue exists
  let brokerState = await MessageBroker.ensureQueue(
    initializedState.brokerState,
    queueName,
    options.queueOptions
  );

  // Bind queue to exchange
  brokerState = await MessageBroker.bindQueue(
    brokerState,
    queueName,
    initializedState.config.exchangeName,
    routingKey
  );

  // Get registered handler
  const handlerInfo = initializedState.handlers.get(messageType);
  if (!handlerInfo) {
    const error = new Error(`No handler registered for message type: ${messageType}`);
    throw error;
  }

  // Create wrapped handler
  const wrappedHandler = createServiceMessageHandler(
    initializedState,
    messageType,
    handlerInfo.handler
  );

  // Start consumer
  const { consumerTag, state: newBrokerState } = await MessageBroker.consume(
    brokerState,
    queueName,
    wrappedHandler,
    {
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 5000,
      ...handlerInfo.options
    }
  );

  logger.info(`${initializedState.serviceName} consumer started`, {
    meta: {
      messageType,
      queueName,
      routingKey,
      consumerTag: consumerTag.consumerTag
    }
  });

  const updatedState = updateServiceState(initializedState, { brokerState: newBrokerState });
  return { consumerTag, state: updatedState };
});

// ==================== BATCH OPERATIONS ====================

/**
 * Start all consumers for a service
 */
export const startAllServiceConsumers = asyncHandler(async (state) => {
  const initializedState = state.initialized ? state : await initializeService(state);

  const consumerPromises = Array.from(initializedState.handlers.keys()).map((messageType) => {
    const handlerInfo = initializedState.handlers.get(messageType);
    return setupServiceConsumer(initializedState, messageType, handlerInfo.options);
  });

  const results = await Promise.all(consumerPromises);
  const consumers = results.map((r) => r.consumerTag);
  const finalState = results[results.length - 1]?.state || initializedState;

  logger.info(`All ${initializedState.serviceName} consumers started`, {
    meta: {
      consumerCount: consumers.length,
      messageTypes: Array.from(initializedState.handlers.keys())
    }
  });

  return { consumers, state: finalState };
});

/**
 * Publish multiple messages in batch
 */
export const publishBatch = asyncHandler(async (state, messages) => {
  const initializedState = state.initialized ? state : await initializeService(state);

  const results = [];
  const errors = [];

  for (const { messageType, data, options = {} } of messages) {
    const result = await publishServiceMessage(initializedState, messageType, data, options)
      .then(({ result }) => {
        results.push({ messageType, result, success: true });
      })
      .catch((error) => {
        errors.push({ messageType, error: error.message, success: false });
      });
  }

  logger.info(`Batch message publishing completed for ${initializedState.serviceName}`, {
    meta: {
      totalMessages: messages.length,
      successful: results.length,
      failed: errors.length
    }
  });

  return { results, errors, success: errors.length === 0, state: initializedState };
});

// ==================== HEALTH AND MONITORING ====================

/**
 * Service health check
 */
export const serviceHealthCheck = asyncHandler(async (state) => {
  const { result } = await publishServiceMessage(
    state,
    'health.check',
    {
      timestamp: new Date().toISOString(),
      service: state.serviceName
    },
    { priority: 1 }
  );

  return {
    status: 'healthy',
    service: state.serviceName,
    initialized: state.initialized,
    messageId: result.messageId
  };
});

// ==================== HIGHER-ORDER FUNCTIONS ====================

/**
 * Create a service-specific publisher function
 */
export const createServicePublisher =
  (state) =>
  (messageType, data, options = {}) =>
    publishServiceMessage(state, messageType, data, options);

/**
 * Create a service-specific consumer setup function
 */
export const createServiceConsumerSetup =
  (state) =>
  (messageType, options = {}) =>
    setupServiceConsumer(state, messageType, options);

/**
 * Create a message type validator
 */
export const createMessageValidator = (state) => (messageType, data) =>
  validateMessage(state, messageType, data);

/**
 * Compose service operations
 */
export const composeServiceOperations = (...operations) =>
  asyncHandler(async (initialState) => {
    let currentState = initialState;

    for (const operation of operations) {
      const result = await operation(currentState);
      currentState = result.state || result;
    }

    return currentState;
  });

// ==================== UTILITY FUNCTIONS ====================

/**
 * Add multiple schemas to service state
 */
export const addMultipleSchemas = (state, schemas) => {
  let currentState = state;
  for (const { messageType, schema } of schemas) {
    currentState = addSchema(currentState, messageType, schema);
  }
  return currentState;
};

/**
 * Add multiple handlers to service state
 */
export const addMultipleHandlers = (state, handlers) => {
  let currentState = state;
  for (const { messageType, handler, options } of handlers) {
    currentState = addHandler(currentState, messageType, handler, options);
  }
  return currentState;
};

/**
 * Create a service with configuration
 */
export const configureService = (serviceName, config = {}) => {
  createServiceState(serviceName, config);
};

/**
 * Transform message data before publishing
 */
export const transformMessageData = (data, transformer) => {
  transformer(data);
};

/**
 * Retry an async operation with exponential backoff
 */
export const retryOperation = asyncHandler(async (fn, maxRetries = 3, delay = 1000) => {
  const attempt = 1;

  while (attempt <= maxRetries) {
    const result = await fn().catch((error) => {
      if (attempt === maxRetries) {
        throw error;
      }

      return new Promise((resolve) => setTimeout(resolve, delay * attempt));
    });

    if (result !== null) {
      return result;
    }
  }
});
/**
 * Add logging to function execution
 */
export const logFunctionExecution = asyncHandler(async (fn, logLevel = 'info', ...args) => {
  const startTime = Date.now();

  const result = await fn(...args);
  const duration = Date.now() - startTime;

  logger[logLevel]('Function executed successfully', {
    meta: { functionName: fn.name, duration, args: args.length }
  });

  return result;
});

/**
 * Safe async operation wrapper
 */
export const safeAsyncOperation = asyncHandler(async (fn, ...args) => {
  const result = await fn(...args);
  return { success: true, data: result, error: null };
});

/**
 * Safe message publishing
 */
export const safePublishMessage = asyncHandler(async (state, messageType, data, options = {}) => {
  const result = await publishServiceMessage(state, messageType, data, options);
  return { success: true, data: result, error: null };
});

/**
 * Safe consumer setup
 */
export const safeSetupConsumer = asyncHandler(async (state, messageType, options = {}) => {
  const result = await setupServiceConsumer(state, messageType, options);
  return { success: true, data: result, error: null };
});
