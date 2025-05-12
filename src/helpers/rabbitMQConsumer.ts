import { getConnection } from '../connections/connectRabbitMQ';
import { logger } from '../utils/logger';
import { ExchangeTypes } from './rabbitMQProducer';
import { Channel, ConsumeMessage } from 'amqplib';

type AssertQueueOptions = {
  exclusive?: boolean;
  durable?: boolean;
  autoDelete?: boolean;
  arguments?: any;
  messageTtl?: number;
  expires?: number;
  deadLetterExchange?: string;
  deadLetterRoutingKey?: string;
  maxLength?: number;
  maxPriority?: number;
};

type ConsumeOptions = {
  consumerTag?: string;
  noLocal?: boolean;
  noAck?: boolean;
  exclusive?: boolean;
  priority?: number;
  arguments?: any;
  prefetch?: number;
  setupRetryQueue?: boolean;
  requeue?: boolean;
};

type BindingOptions = {
  arguments?: any;
};

type ConsumerState = {
  queueName: string;
  queueOptions: AssertQueueOptions;
  channel: Channel | null;
  consumerTag: string | null;
  queueExists: boolean;
};

type RetryConfig = {
  enabled: boolean;
  maxRetries: number;
  delays: number[];
};

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  enabled: true,
  maxRetries: 5,
  delays: [1000, 5000, 10000, 30000, 60000]
};

// Internal state management
const consumerStates = new Map<string, ConsumerState>();

const initializeChannel = async (
  queueName: string,
  queueOptions: AssertQueueOptions = {}
): Promise<Channel> => {
  const state = consumerStates.get(queueName) || {
    queueName,
    queueOptions: {
      durable: true,
      maxPriority: 10,
      ...queueOptions
    },
    channel: null,
    consumerTag: null,
    queueExists: false
  };

  if (state.channel) {
    return state.channel;
  }

  try {
    const connection = await getConnection();
    const channel = await (connection as any).createChannel();

    if (!channel) {
      throw new Error('Failed to create channel');
    }

    try {
      await channel.checkQueue(queueName);
      state.queueExists = true;
      logger.info('Queue already exists, using existing configuration', {
        meta: { queueName }
      });
    } catch {
      state.queueExists = false;
    }

    await channel.assertQueue(queueName, state.queueExists ? {} : state.queueOptions);

    state.channel = channel;
    consumerStates.set(queueName, state);

    logger.info('RabbitMQ consumer initialized', {
      meta: {
        queueName,
        queueOptions: state.queueExists ? 'using existing configuration' : state.queueOptions
      }
    });

    return channel;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to initialize RabbitMQ consumer', {
      meta: {
        error: err.message,
        queueName
      }
    });
    throw err;
  }
};

export const bindQueue = async (
  queueName: string,
  exchangeName: string,
  bindingKey = '',
  bindingOptions: BindingOptions = {}
): Promise<void> => {
  const channel = await initializeChannel(queueName);

  try {
    await channel.bindQueue(queueName, exchangeName, bindingKey, bindingOptions);

    logger.info('Queue bound to exchange', {
      meta: {
        queueName,
        exchangeName,
        bindingKey
      }
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to bind queue to exchange', {
      meta: {
        error: err.message,
        queueName,
        exchangeName,
        bindingKey
      }
    });
    throw err;
  }
};

const setupRetryMechanism = async (
  queueName: string,
  channel: Channel,
  queueOptions: AssertQueueOptions
): Promise<void> => {
  const state = consumerStates.get(queueName);

  if (!state || state.queueExists) {
    return;
  }

  const deadLetterExchange = queueOptions.deadLetterExchange || `${queueName}.dlx`;
  const retryExchange = `${queueName}.retry`;
  const retryQueue = `${queueName}.retry`;

  await channel.assertExchange(deadLetterExchange, ExchangeTypes.DIRECT, {
    durable: true
  });
  await channel.assertExchange(retryExchange, ExchangeTypes.DIRECT, {
    durable: true
  });

  await channel.assertQueue(queueName, {
    ...queueOptions,
    deadLetterExchange
  });

  await channel.assertQueue(retryQueue, {
    durable: true,
    deadLetterExchange: '',
    deadLetterRoutingKey: queueName
  });

  await channel.bindQueue(retryQueue, retryExchange, '');
  await channel.bindQueue(queueName, deadLetterExchange, '');

  logger.info('Retry mechanism configured for queue', {
    meta: {
      queueName,
      retryQueue,
      deadLetterExchange
    }
  });
};

export const consume = async (
  queueName: string,
  messageHandler: (content: any, msg: ConsumeMessage) => Promise<void>,
  consumeOptions: ConsumeOptions = {},
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<string> => {
  const channel = await initializeChannel(queueName);
  const state = consumerStates.get(queueName);

  if (!state) {
    throw new Error('Consumer state not found');
  }

  if (retryConfig.enabled && consumeOptions.setupRetryQueue !== false) {
    await setupRetryMechanism(queueName, channel, state.queueOptions);
  }

  const prefetch = consumeOptions.prefetch || 10;
  await channel.prefetch(prefetch);

  const options = {
    noAck: false,
    ...consumeOptions
  };

  // Remove non-amqplib options
  delete (options as any).prefetch;
  delete (options as any).setupRetryQueue;
  delete (options as any).requeue;

  try {
    const { consumerTag } = await channel.consume(
      queueName,
      async (msg) => {
        if (!msg) {
          logger.warn('Consumer cancelled by server', {
            meta: { queueName }
          });
          return;
        }

        try {
          const content = JSON.parse(msg.content.toString());
          const headers = msg.properties.headers || {};
          const retryCount = headers['x-retry-count'] || 0;

          logger.debug('Received message', {
            meta: {
              queueName,
              routingKey: msg.fields.routingKey,
              exchange: msg.fields.exchange,
              retryCount,
              priority: msg.properties.priority || 0
            }
          });

          await messageHandler(content, msg);
          channel.ack(msg);
        } catch (error: unknown) {
          const err = error instanceof Error ? error : new Error(String(error));
          handleMessageError(channel, msg, err, queueName, consumeOptions, retryConfig);
        }
      },
      options
    );

    state.consumerTag = consumerTag;
    consumerStates.set(queueName, state);

    logger.info('Started consuming messages', {
      meta: {
        queueName,
        consumerTag,
        prefetch,
        retryEnabled: retryConfig.enabled,
        maxRetries: retryConfig.maxRetries
      }
    });

    return consumerTag;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to start consuming messages', {
      meta: {
        error: err.message,
        queueName
      }
    });
    throw err;
  }
};

const handleMessageError = (
  channel: Channel,
  msg: ConsumeMessage,
  error: Error,
  queueName: string,
  consumeOptions: ConsumeOptions,
  retryConfig: RetryConfig
): void => {
  logger.error('Error processing message', {
    meta: {
      error: error.message,
      stack: error.stack,
      queueName,
      routingKey: msg.fields.routingKey
    }
  });

  const headers = msg.properties.headers || {};
  const retryCount = (headers['x-retry-count'] || 0) + 1;

  if (retryConfig.enabled && retryCount <= retryConfig.maxRetries) {
    const delayIndex = Math.min(retryCount - 1, retryConfig.delays.length - 1);
    const delay = retryConfig.delays[delayIndex];

    const retryExchange = `${queueName}.retry`;
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

    logger.info(`Scheduling retry ${retryCount}/${retryConfig.maxRetries} in ${delay}ms`, {
      meta: {
        queueName,
        retryCount
      }
    });

    channel.publish(retryExchange, '', msg.content, retryOptions);
    channel.ack(msg);
  } else if ((consumeOptions as any).requeue !== false && !retryConfig.enabled) {
    channel.nack(msg, false, true);
  } else {
    logger.warn('Discarding failed message after max retries', {
      meta: {
        queueName,
        retryCount
      }
    });
    channel.ack(msg);
  }
};

export const stopConsuming = async (queueName: string): Promise<void> => {
  const state = consumerStates.get(queueName);
  if (state?.channel && state.consumerTag) {
    try {
      await state.channel.cancel(state.consumerTag);
      state.consumerTag = null;
      consumerStates.set(queueName, state);
      logger.info('Stopped consuming messages', {
        meta: { queueName }
      });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error stopping consumer', {
        meta: {
          error: err.message,
          queueName
        }
      });
      throw err;
    }
  }
};

export const closeConsumer = async (queueName: string): Promise<void> => {
  const state = consumerStates.get(queueName);
  if (state?.consumerTag) {
    await stopConsuming(queueName);
  }

  if (state?.channel) {
    try {
      await state.channel.close();
      state.channel = null;
      consumerStates.delete(queueName);
      logger.info('RabbitMQ consumer channel closed', {
        meta: { queueName }
      });
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error closing consumer channel', {
        meta: {
          error: err.message,
          queueName
        }
      });
      throw err;
    }
  }
};

export const createConsumer = async (
  queueName: string,
  queueOptions: AssertQueueOptions = {}
): Promise<void> => {
  await initializeChannel(queueName, queueOptions);
};

export const createBoundConsumer = async (
  queueName: string,
  exchangeName: string,
  bindingKey = '',
  options: { queueOptions?: AssertQueueOptions; bindingOptions?: BindingOptions } = {}
): Promise<void> => {
  const { queueOptions = {}, bindingOptions = {} } = options;
  await initializeChannel(queueName, queueOptions);
  await bindQueue(queueName, exchangeName, bindingKey, bindingOptions);
};

export const setupPriorityQueue = async (
  queueName: string,
  maxPriority = 10,
  queueOptions: AssertQueueOptions = {}
): Promise<void> => {
  try {
    await createConsumer(queueName, {
      ...queueOptions,
      maxPriority
    });

    logger.info('Priority queue set up successfully', {
      meta: {
        queueName,
        maxPriority
      }
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to set up priority queue', {
      meta: {
        error: err.message,
        queueName
      }
    });
    throw err;
  }
};
