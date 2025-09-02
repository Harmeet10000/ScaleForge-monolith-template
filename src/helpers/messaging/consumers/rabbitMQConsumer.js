import { getConnection } from '../db/rabbitMQConnection.js';
import { logger } from '../../../utils/logger.js';
import { ExchangeTypes } from '../rabbitMQProducer.js';
import asyncHandler from 'express-async-handler';

// Create a consumer state object
export const createConsumerState = (queueName, queueOptions = {}) => ({
  queueName,
  queueOptions: {
    durable: true,
    maxPriority: 10,
    ...queueOptions
  },
  channel: null,
  consumerTag: null,
  retryConfig: {
    enabled: true,
    maxRetries: 5,
    delays: [1000, 5000, 10000, 30000, 60000] // Increasingly delayed retries in ms
  },
  queueExists: false
});

// Initialize the consumer's channel and queue
export const initializeConsumer = asyncHandler(async (consumerState) => {
  if (consumerState.channel) {
    return consumerState;
  }

  const connection = await getConnection();
  const channel = await connection.createChannel();
  let { queueExists } = consumerState;

  // Check if queue already exists to avoid modifying existing configuration
  try {
    await channel.checkQueue(consumerState.queueName);
    queueExists = true;
    logger.info('Queue already exists, using existing configuration', {
      meta: {
        queueName: consumerState.queueName
      }
    });
  } catch (checkError) {
    // Queue doesn't exist, will be created with provided options
    logger.error('Queue does not exist, creating with provided options', {
      meta: {
        queueName: consumerState.queueName,
        error: checkError.message,
        stack: checkError.err
      }
    });
    queueExists = false;
  }

  // If queue exists, we assert it without changing its properties
  // If it doesn't exist, create it with the specified options
  await channel.assertQueue(consumerState.queueName, queueExists ? {} : consumerState.queueOptions);

  logger.info('RabbitMQ consumer initialized', {
    meta: {
      queueName: consumerState.queueName,
      queueOptions: queueExists ? 'using existing configuration' : consumerState.queueOptions
    }
  });

  return { ...consumerState, channel, queueExists };
});

// Bind the queue to an exchange
export const bindQueue = asyncHandler(
  async (consumerState, exchangeName, bindingKey = '', bindingOptions = {}) => {
    // Initialize if not already initialized
    const state = consumerState.channel ? consumerState : await initializeConsumer(consumerState);

    await state.channel.bindQueue(state.queueName, exchangeName, bindingKey, bindingOptions);

    logger.info('Queue bound to exchange', {
      meta: {
        queueName: state.queueName,
        exchangeName,
        bindingKey
      }
    });

    return state;
  }
);

// Setup retry mechanism for the queue
export const setupRetryQueue = asyncHandler(async (consumerState) => {
  // Initialize if not already initialized
  const state = consumerState.channel ? consumerState : await initializeConsumer(consumerState);

  if (!state.retryConfig.enabled) {
    return state;
  }

  // Don't modify queue configuration if it already exists
  if (state.queueExists) {
    logger.info('Queue already exists, skipping retry queue setup', {
      meta: {
        queueName: state.queueName
      }
    });
    return state;
  }

  // Check if deadLetterExchange is already specified in queue options
  const deadLetterExchange = state.queueOptions.deadLetterExchange || `${state.queueName}.dlx`;
  const retryExchange = `${state.queueName}.retry`;
  const retryQueue = `${state.queueName}.retry`;

  await state.channel.assertExchange(deadLetterExchange, ExchangeTypes.DIRECT, {
    durable: true
  });
  await state.channel.assertExchange(retryExchange, ExchangeTypes.DIRECT, { durable: true });

  // Set up the main queue with DLX configuration
  await state.channel.assertQueue(state.queueName, {
    ...state.queueOptions,
    deadLetterExchange
  });

  // Set up the retry queue with TTL and DLX back to the main exchange
  await state.channel.assertQueue(retryQueue, {
    durable: true,
    deadLetterExchange: '',
    deadLetterRoutingKey: state.queueName
  });

  await state.channel.bindQueue(retryQueue, retryExchange, '');
  await state.channel.bindQueue(state.queueName, deadLetterExchange, '');

  logger.info('Retry mechanism configured for queue', {
    meta: {
      queueName: state.queueName,
      retryQueue,
      deadLetterExchange
    }
  });

  return state;
});

// Start consuming messages from the queue
export const consumeQueue = asyncHandler(
  async (consumerState, messageHandler, consumeOptions = {}) => {
    // Initialize if not already initialized
    let state = consumerState.channel ? consumerState : await initializeConsumer(consumerState);

    // Set up retry mechanism if needed
    if (state.retryConfig.enabled && consumeOptions.setupRetryQueue !== false) {
      state = await setupRetryQueue(state);
    }

    // Set prefetch/QoS to prevent overwhelming the consumer
    const prefetch = consumeOptions.prefetch || 10;
    await state.channel.prefetch(prefetch);

    const options = {
      noAck: false,
      ...consumeOptions
    };

    // Remove non-amqplib options
    delete options.prefetch;
    delete options.setupRetryQueue;

    const { consumerTag } = await state.channel.consume(
      state.queueName,
      async (msg) => {
        if (!msg) {
          logger.warn('Consumer cancelled by server', {
            meta: { queueName: state.queueName }
          });
          return;
        }

        try {
          // Parse message content
          const content = JSON.parse(msg.content.toString());

          // Get retry count from headers
          const headers = msg.properties.headers || {};
          const retryCount = headers['x-retry-count'] || 0;

          logger.debug('Received message', {
            meta: {
              queueName: state.queueName,
              routingKey: msg.fields.routingKey,
              exchange: msg.fields.exchange,
              retryCount,
              priority: msg.properties.priority || 0
            }
          });

          // Process message with handler
          await messageHandler(content, msg);

          // Acknowledge message on success
          state.channel.ack(msg);
        } catch (error) {
          logger.error('Error processing message', {
            meta: {
              error: error.message,
              stack: error.stack,
              queueName: state.queueName,
              routingKey: msg.fields.routingKey
            }
          });

          const headers = msg.properties.headers || {};
          const retryCount = (headers['x-retry-count'] || 0) + 1;

          if (state.retryConfig.enabled && retryCount <= state.retryConfig.maxRetries) {
            // Get delay for current retry attempt
            const delayIndex = Math.min(retryCount - 1, state.retryConfig.delays.length - 1);
            const delay = state.retryConfig.delays[delayIndex];

            // Publish to retry exchange with TTL
            const retryExchange = `${state.queueName}.retry`;
            const retryOptions = {
              persistent: true,
              headers: {
                ...headers,
                'x-retry-count': retryCount,
                'x-original-exchange': msg.fields.exchange,
                'x-original-routing-key': msg.fields.routingKey
              },
              expiration: delay.toString()
            };

            logger.info(
              `Scheduling retry ${retryCount}/${state.retryConfig.maxRetries} in ${delay}ms`,
              {
                meta: {
                  queueName: state.queueName,
                  retryCount
                }
              }
            );

            state.channel.publish(retryExchange, '', msg.content, retryOptions);

            // Acknowledge original message
            state.channel.ack(msg);
          } else if (options.requeue !== false && !state.retryConfig.enabled) {
            // Simple requeue if retry mechanism is disabled
            state.channel.nack(msg, false, true);
          } else {
            // Max retries reached or requeue disabled, ack to remove from queue
            logger.warn('Discarding failed message after max retries', {
              meta: {
                queueName: state.queueName,
                retryCount
              }
            });
            state.channel.ack(msg);
          }
        }
      },
      options
    );

    logger.info('Started consuming messages', {
      meta: {
        queueName: state.queueName,
        consumerTag,
        prefetch,
        retryEnabled: state.retryConfig.enabled,
        maxRetries: state.retryConfig.maxRetries
      }
    });

    return { ...state, consumerTag };
  }
);

// Stop consuming messages
export const stopConsuming = asyncHandler(async (consumerState) => {
  if (consumerState.channel && consumerState.consumerTag) {
    await consumerState.channel.cancel(consumerState.consumerTag);

    logger.info('Stopped consuming messages', {
      meta: { queueName: consumerState.queueName }
    });

    return { ...consumerState, consumerTag: null };
  }
  return consumerState;
});

// Close the consumer's channel
export const closeConsumer = asyncHandler(async (consumerState) => {
  let state = consumerState;

  if (state.consumerTag) {
    state = await stopConsuming(state);
  }

  if (state.channel) {
    await state.channel.close();

    logger.info('RabbitMQ consumer channel closed', {
      meta: { queueName: state.queueName }
    });

    return { ...state, channel: null };
  }
  return state;
});

// Factory function to create and initialize a consumer
export const createConsumer = asyncHandler(async (queueName, queueOptions = {}) => {
  const consumerState = createConsumerState(queueName, queueOptions);
  const initializedState = await initializeConsumer(consumerState);

  // Return an API object with methods that operate on the internal state
  return {
    bindQueue: (exchangeName, bindingKey = '', bindingOptions = {}) =>
      bindQueue(initializedState, exchangeName, bindingKey, bindingOptions),
    setupRetryQueue: () => setupRetryQueue(initializedState),
    consume: (messageHandler, consumeOptions = {}) =>
      consumeQueue(initializedState, messageHandler, consumeOptions),
    stopConsuming: () => stopConsuming(initializedState),
    close: () => closeConsumer(initializedState),
    // Expose state for advanced usage (but encourage to use the API methods)
    getState: () => ({ ...initializedState })
  };
});

// Create a consumer bound to an exchange
export const createBoundConsumer = asyncHandler(
  async (queueName, exchangeName, bindingKey = '', options = {}) => {
    const { queueOptions = {}, bindingOptions = {} } = options;

    // Create and initialize the consumer
    const consumer = await createConsumer(queueName, queueOptions);
    // Bind to the exchange
    await consumer.bindQueue(exchangeName, bindingKey, bindingOptions);

    return consumer;
  }
);

// Set up a priority queue
export const setupPriorityQueue = asyncHandler(
  async (queueName, maxPriority = 10, queueOptions = {}) => {
    const consumer = await createConsumer(queueName, {
      ...queueOptions,
      maxPriority
    });

    logger.info('Priority queue set up successfully', {
      meta: {
        queueName,
        maxPriority
      }
    });

    return consumer;
  }
);
