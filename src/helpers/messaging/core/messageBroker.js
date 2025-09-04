import { getConnection } from '../../../connections/connectRabbitMQ.js';
import { logger } from '../../../utils/logger.js';
import { httpError } from '../../../utils/httpError.js';
import { nanoid } from 'nanoid';
import asyncHandler from 'express-async-handler';

/**
 * Functional Message Broker - Pure functions for messaging operations
 * No classes, no state mutations, just pure functional goodness
 */

// ==================== CORE STATE MANAGEMENT ====================

/**
 * Create initial broker state
 */
export const createBrokerState = (config = {}) => ({
  config: {
    defaultExchange: config.defaultExchange || 'default',
    defaultExchangeType: config.defaultExchangeType || 'topic',
    retryAttempts: config.retryAttempts || 3,
    retryDelay: config.retryDelay || 1000,
    ...config
  },
  connection: null,
  channels: new Map(),
  exchanges: new Set(),
  queues: new Set()
});

/**
 * Update broker state immutably
 */
const updateBrokerState = (state, updates) => ({
  ...state,
  ...updates
});

/**
 * Add channel to state
 */
const addChannelToState = (state, channelId, channel) => {
  const newChannels = new Map(state.channels);
  newChannels.set(channelId, channel);
  return updateBrokerState(state, { channels: newChannels });
};

/**
 * Add exchange to state
 */
const addExchangeToState = (state, exchangeName, exchangeType) => {
  const newExchanges = new Set(state.exchanges);
  newExchanges.add(`${exchangeName}:${exchangeType}`);
  return updateBrokerState(state, { exchanges: newExchanges });
};

/**
 * Add queue to state
 */
const addQueueToState = (state, queueName) => {
  const newQueues = new Set(state.queues);
  newQueues.add(queueName);
  return updateBrokerState(state, { queues: newQueues });
};

// ==================== PURE UTILITY FUNCTIONS ====================

/**
 * Create enriched message
 */
const createEnrichedMessage = (message, options = {}) => ({
  id: nanoid(),
  timestamp: new Date().toISOString(),
  data: message,
  metadata: {
    source: options.source || 'unknown',
    correlationId: options.correlationId || nanoid(),
    ...options.metadata
  }
});

/**
 * Create publish options
 */
const createPublishOptions = (enrichedMessage, options = {}) => ({
  persistent: true,
  messageId: enrichedMessage.id,
  timestamp: Date.now(),
  correlationId: enrichedMessage.metadata.correlationId,
  ...options
});

/**
 * Create retry delay with exponential backoff
 */
const calculateRetryDelay = (attempt, baseDelay = 1000) => baseDelay * Math.pow(2, attempt - 1);

/**
 * Create message buffer
 */
const createMessageBuffer = (message) => Buffer.from(JSON.stringify(message));

/**
 * Parse message content
 */
const parseMessageContent = asyncHandler(async (msg) => {
  const content = JSON.parse(msg.content.toString());
  return content;
});

// ==================== CONNECTION MANAGEMENT ====================

/**
 * Get or create channel (pure function with side effects)
 */
export const getChannel = asyncHandler(async (state, channelId = 'default') => {
  if (state.channels.has(channelId)) {
    return {
      channel: state.channels.get(channelId),
      state
    };
  }

  const connection = state.connection || (await getConnection());
  const channel = await connection.createChannel();

  // Enable publisher confirms for reliability
  await channel.confirmChannel();
  await channel.prefetch(10);

  const newState = addChannelToState(updateBrokerState(state, { connection }), channelId, channel);

  logger.info('RabbitMQ channel created', {
    meta: { channelId, totalChannels: newState.channels.size }
  });

  return { channel, state: newState };
});

// ==================== INFRASTRUCTURE SETUP ====================

/**
 * Ensure exchange exists
 */
export const ensureExchange = asyncHandler(
  async (state, exchangeName, exchangeType = 'topic', options = {}) => {
    const exchangeKey = `${exchangeName}:${exchangeType}`;

    if (state.exchanges.has(exchangeKey)) {
      return state;
    }

    const { channel, state: newState } = await getChannel(state);
    await channel.assertExchange(exchangeName, exchangeType, {
      durable: true,
      ...options
    });

    const finalState = addExchangeToState(newState, exchangeName, exchangeType);

    logger.debug('Exchange ensured', {
      meta: { exchangeName, exchangeType, options }
    });

    return finalState;
  }
);

/**
 * Ensure queue exists
 */
export const ensureQueue = asyncHandler(async (state, queueName, options = {}) => {
  if (state.queues.has(queueName)) {
    return state;
  }

  const { channel, state: newState } = await getChannel(state);
  await channel.assertQueue(queueName, {
    durable: true,
    maxPriority: 10,
    ...options
  });

  const finalState = addQueueToState(newState, queueName);

  logger.debug('Queue ensured', {
    meta: { queueName, options }
  });

  return finalState;
});

/**
 * Bind queue to exchange
 */
export const bindQueue = asyncHandler(
  async (state, queueName, exchangeName, routingKey = '#', options = {}) => {
    const { channel, state: newState } = await getChannel(state);
    await channel.bindQueue(queueName, exchangeName, routingKey, options);

    logger.debug('Queue bound to exchange', {
      meta: { queueName, exchangeName, routingKey }
    });

    return newState;
  }
);

// ==================== MESSAGE PUBLISHING ====================

/**
 * Publish single message attempt
 */
const publishMessageAttempt = asyncHandler(
  async (state, exchangeName, routingKey, enrichedMessage, publishOptions) => {
    const { channel } = await getChannel(state);
    const messageBuffer = createMessageBuffer(enrichedMessage);

    return new Promise((resolve, reject) => {
      channel.publish(exchangeName, routingKey, messageBuffer, publishOptions, (err) => {
        if (err) {reject(err);}
        else {resolve(true);}
      });
    });
  }
);

/**
 * Publish message with retries (recursive functional approach)
 */
const publishWithRetries = asyncHandler(
  async (state, exchangeName, routingKey, enrichedMessage, publishOptions, attempt = 1) => {
    const maxAttempts = state.config.retryAttempts;

    if (attempt <= maxAttempts) {
      const result = await publishMessageAttempt(
        state,
        exchangeName,
        routingKey,
        enrichedMessage,
        publishOptions
      ).catch(async (error) => {
        if (attempt >= maxAttempts) {
          logger.error('Failed to publish message after retries', {
            meta: {
              messageId: enrichedMessage.id,
              exchangeName,
              routingKey,
              error: error.message,
              attempts: attempt
            }
          });
          throw error;
        }

        logger.warn(`Retrying message publish (${attempt}/${maxAttempts})`, {
          meta: { messageId: enrichedMessage.id, exchangeName, routingKey }
        });

        const delay = calculateRetryDelay(attempt, state.config.retryDelay);
        await new Promise((resolve) => setTimeout(resolve, delay));

        return publishWithRetries(
          state,
          exchangeName,
          routingKey,
          enrichedMessage,
          publishOptions,
          attempt + 1
        );
      });

      logger.info('Message published successfully', {
        meta: {
          messageId: enrichedMessage.id,
          exchangeName,
          routingKey,
          size: createMessageBuffer(enrichedMessage).length,
          attempt
        }
      });

      return { success: true, messageId: enrichedMessage.id, attempt };
    }

    throw new Error('Max retry attempts exceeded');
  }
);

/**
 * Main publish function
 */
export const publishMessage = asyncHandler(
  async (state, exchangeName, routingKey, message, options = {}) => {
    const enrichedMessage = createEnrichedMessage(message, options);
    const publishOptions = createPublishOptions(enrichedMessage, options);

    return publishWithRetries(state, exchangeName, routingKey, enrichedMessage, publishOptions);
  }
);

// ==================== MESSAGE CONSUMPTION ====================

/**
 * Create message handler wrapper
 */
const createMessageHandler = (handler, options = {}) =>
  asyncHandler(async (msg) => {
    if (!msg) { return; }

    const messageId = msg.properties.messageId || 'unknown';
    const correlationId = msg.properties.correlationId || 'unknown';

    const content = await parseMessageContent(msg);

    logger.debug('Processing message', {
      meta: { messageId, correlationId }
    });

    await handler(content, msg);

    logger.info('Message processed successfully', {
      meta: { messageId, correlationId }
    });

    return { success: true, messageId };
  });

/**
 * Handle message retry logic
 */
const handleMessageRetry = asyncHandler(async (state, msg, error, options = {}) => {
  const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) + 1;
  const maxRetries = options.maxRetries || 3;

  if (retryCount <= maxRetries) {
    await retryMessage(state, msg, retryCount, options.retryDelay || 5000);
    return { action: 'retry', retryCount };
  }
  await sendToDeadLetterQueue(state, msg, error);
  return { action: 'dlq', retryCount };
});

/**
 * Create consumer wrapper with error handling
 */
const createConsumerWrapper = (state, handler, options = {}) =>
  asyncHandler(async (msg) => {
    if (!msg) {return;}

    const { channel } = await getChannel(state);
    const wrappedHandler = createMessageHandler(handler, options);

    const result = await wrappedHandler(msg).catch(async (error) => {
      const retryResult = await handleMessageRetry(state, msg, error, options);

      logger.info('Message handled with retry/dlq', {
        meta: {
          messageId: msg.properties.messageId,
          action: retryResult.action,
          retryCount: retryResult.retryCount
        }
      });

      return { success: false, error: error.message };
    });

    channel.ack(msg);
    return result;
  });

/**
 * Start consumer
 */
export const consume = asyncHandler(async (state, queueName, handler, options = {}) => {
  const { channel, state: newState } = await getChannel(state);

  const consumerOptions = {
    noAck: false,
    exclusive: false,
    ...options
  };

  const wrappedHandler = createConsumerWrapper(newState, handler, options);
  const consumerTag = await channel.consume(queueName, wrappedHandler, consumerOptions);

  logger.info('Consumer started', {
    meta: { queueName, consumerTag: consumerTag.consumerTag }
  });

  return { consumerTag, state: newState };
});

// ==================== RETRY AND DLQ HANDLING ====================

/**
 * Retry message with delay
 */
export const retryMessage = asyncHandler(async (state, originalMsg, retryCount, delay) => {
  const retryExchange = 'retry.exchange';
  const retryQueue = `retry.${originalMsg.fields.routingKey}`;

  let newState = await ensureExchange(state, retryExchange, 'direct');
  newState = await ensureQueue(newState, retryQueue, {
    arguments: {
      'x-message-ttl': delay,
      'x-dead-letter-exchange': originalMsg.fields.exchange,
      'x-dead-letter-routing-key': originalMsg.fields.routingKey
    }
  });

  const retryHeaders = {
    ...originalMsg.properties.headers,
    'x-retry-count': retryCount,
    'x-original-exchange': originalMsg.fields.exchange,
    'x-original-routing-key': originalMsg.fields.routingKey
  };

  const originalContent = await parseMessageContent(originalMsg);
  await publishMessage(newState, retryExchange, retryQueue, originalContent, {
    headers: retryHeaders
  });

  logger.info('Message scheduled for retry', {
    meta: {
      messageId: originalMsg.properties.messageId,
      retryCount,
      delay
    }
  });

  return newState;
});

/**
 * Send message to Dead Letter Queue
 */
export const sendToDeadLetterQueue = asyncHandler(async (state, msg, error) => {
  const dlqExchange = 'dlq.exchange';
  const dlqQueue = 'dlq.queue';

  let newState = await ensureExchange(state, dlqExchange, 'direct');
  newState = await ensureQueue(newState, dlqQueue);

  const originalContent = await parseMessageContent(msg);
  const dlqMessage = {
    originalMessage: originalContent,
    error: {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    },
    originalProperties: msg.properties,
    originalFields: msg.fields
  };

  await publishMessage(newState, dlqExchange, dlqQueue, dlqMessage, {
    headers: { 'x-death-reason': 'max-retries-exceeded' }
  });

  logger.error('Message sent to DLQ', {
    meta: {
      messageId: msg.properties.messageId,
      error: error.message
    }
  });

  return newState;
});

// ==================== HEALTH AND CLEANUP ====================

/**
 * Health check
 */
export const healthCheck = asyncHandler(async (state) => {
  await publishMessage(
    state,
    'health.exchange',
    'health.check',
    {
      timestamp: new Date().toISOString(),
      service: 'message-broker'
    },
    { priority: 1 }
  );

  return {
    status: 'healthy',
    channels: state.channels.size,
    exchanges: state.exchanges.size,
    queues: state.queues.size
  };
});

/**
 * Close all channels
 */
export const closeAllChannels = asyncHandler(async (state) => {
  logger.info('Closing all channels...');

  const closePromises = Array.from(state.channels.entries()).map(async ([channelId, channel]) => {
    await channel.close().catch((error) => {
      logger.warn(`Error closing channel ${channelId}:`, error.message);
    });
    logger.debug(`Channel ${channelId} closed`);
  });

  await Promise.all(closePromises);

  const cleanState = updateBrokerState(state, {
    channels: new Map(),
    exchanges: new Set(),
    queues: new Set()
  });

  logger.info('All channels closed successfully');
  return cleanState;
});

// ==================== UTILITY FUNCTIONS ====================

/**
 * Create a publisher function for a specific exchange
 */
export const createPublisher = (state, exchangeName) => {
   async (routingKey, message, options = {}) => {
     publishMessage(state, exchangeName, routingKey, message, options);
  };
};

/**
 * Create a consumer function for a specific queue
 */
export const createConsumer = (state, queueName) => {
   async (handler, options = {}) => {
     consume(state, queueName, handler, options);
  };
};

/**
 * Compose multiple broker operations
 */
export const composeBrokerOperations = asyncHandler(async (initialState, operations) => {
  let currentState = initialState;

  for (const operation of operations) {
    currentState = await operation(currentState);
  }

  return currentState;
});

/**
 * Transform message through multiple transformers
 */
export const transformMessage = (message, transformers) => {
  let result = message;
  for (const transformer of transformers) {
    result = transformer(result);
  }
  return result;
};

// ==================== EXPORT DEFAULT STATE ====================

/**
 * Default broker state instance
 */
export const defaultBrokerState = createBrokerState({
  defaultExchange: 'app.exchange',
  defaultExchangeType: 'topic'
});
