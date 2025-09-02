import { getConnection } from '../db/rabbitMQConnection.js';
import { logger } from '../../utils/logger.js';
import asyncHandler from 'express-async-handler';

export const ExchangeTypes = {
  DIRECT: 'direct',
  FANOUT: 'fanout',
  TOPIC: 'topic',
  HEADERS: 'headers'
};

// Create a producer state object
export const createProducerState = (
  exchangeName,
  exchangeType = ExchangeTypes.DIRECT,
  durable = true
) => ({
  exchangeName,
  exchangeType,
  durable,
  channel: null
});

// Initialize the producer's channel and exchange
export const initializeProducer = asyncHandler(async (producerState) => {
  if (producerState.channel) {
    return producerState;
  }

  const connection = await getConnection();
  const channel = await connection.createChannel();

  await channel.assertExchange(producerState.exchangeName, producerState.exchangeType, {
    durable: producerState.durable
  });

  logger.info('RabbitMQ producer initialized', {
    meta: {
      exchangeName: producerState.exchangeName,
      exchangeType: producerState.exchangeType,
      durable: producerState.durable
    }
  });

  return { ...producerState, channel };
});

// Publish a message to the exchange
export const publishMessage = asyncHandler(
  async (producerState, message, routingKey = '', options = {}) => {
    // Initialize if not already initialized
    const state = producerState.channel ? producerState : await initializeProducer(producerState);

    const messageBuffer = Buffer.from(JSON.stringify(message));

    const publishOptions = {
      persistent: true,
      priority: options.priority || 0,
      ...options
    };

    const result = state.channel.publish(
      state.exchangeName,
      routingKey,
      messageBuffer,
      publishOptions
    );

    if (result) {
      logger.debug('Message published successfully', {
        meta: {
          exchangeName: state.exchangeName,
          routingKey,
          messageSize: messageBuffer.length,
          priority: publishOptions.priority
        }
      });
    } else {
      logger.warn('Channel write buffer is full - backpressure being applied', {
        meta: {
          exchangeName: state.exchangeName,
          routingKey
        }
      });
      await new Promise((resolve) => state.channel.once('drain', resolve));
    }

    return { success: result, state };
  }
);

// Publish a message with retry logic
export const publishWithRetry = asyncHandler(
  async (producerState, message, routingKey = '', options = {}, retryOptions = {}) => {
    const delayExecution = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const maxRetries = retryOptions.maxRetries || 3;
    const initialDelay = retryOptions.initialDelay || 500;
    const factor = retryOptions.backoffFactor || 2;

    let attempt = 0;
    let delay = initialDelay;
    const state = producerState;

    while (attempt <= maxRetries) {
      try {
        const result = await publishMessage(state, message, routingKey, options);
        return result;
      } catch (error) {
        attempt++;

        if (attempt > maxRetries) {
          logger.error('Max retries reached when publishing message', {
            meta: {
              error: error.message,
              exchangeName: producerState.exchangeName,
              routingKey,
              attempts: attempt
            }
          });
          throw error;
        }

        logger.warn(`Retrying publish (${attempt}/${maxRetries}) after ${delay}ms`, {
          meta: {
            exchangeName: producerState.exchangeName,
            routingKey
          }
        });
        await delayExecution(delay);
        delay *= factor;
      }
    }
  }
);

// Schedule a message to be delivered after a delay
export const scheduleMessage = asyncHandler(
  async (producerState, message, routingKey = '', delayMs = 0, options = {}) => {
    if (delayMs <= 0) {
      return await publishMessage(producerState, message, routingKey, options);
    }

    const delayedMessage = {
      originalMessage: message,
      originalRoutingKey: routingKey,
      originalExchange: producerState.exchangeName,
      publishOptions: options,
      executionTime: Date.now() + delayMs
    };

    return await publishMessage(producerState, delayedMessage, `delayed.${delayMs}`, {
      ...options,
      headers: { ...options.headers, 'x-delay': delayMs }
    });
  }
);

// Close the producer's channel
export const closeProducer = asyncHandler(async (producerState) => {
  if (producerState.channel) {
    await producerState.channel.close();
    logger.info('RabbitMQ producer channel closed', {
      meta: { exchangeName: producerState.exchangeName }
    });
    return { ...producerState, channel: null };
  }
  return producerState;
});

// Factory function to create and initialize a producer
export const createProducer = asyncHandler(
  async (exchangeName, exchangeType = ExchangeTypes.DIRECT, durable = true) => {
    const producerState = createProducerState(exchangeName, exchangeType, durable);
    const initializedState = await initializeProducer(producerState);

    // Return an API object with methods that operate on the internal state
    return {
      publish: (message, routingKey = '', options = {}) =>
        publishMessage(initializedState, message, routingKey, options),
      publishWithRetry: (message, routingKey = '', options = {}, retryOptions = {}) =>
        publishWithRetry(initializedState, message, routingKey, options, retryOptions),
      scheduleMessage: (message, routingKey = '', delayMs = 0, options = {}) =>
        scheduleMessage(initializedState, message, routingKey, delayMs, options),
      close: () => closeProducer(initializedState),
      // Expose state for advanced usage (but encourage to use the API methods)
      getState: () => ({ ...initializedState })
    };
  }
);
