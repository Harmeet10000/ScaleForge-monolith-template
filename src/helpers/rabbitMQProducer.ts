import {  getConnection } from '../connections/rabbitMQConnection';
import { logger } from '../utils/logger';
import { Channel, Options } from 'amqplib';

export const ExchangeTypes = {
  DIRECT: 'direct',
  FANOUT: 'fanout',
  TOPIC: 'topic',
  HEADERS: 'headers'
} as const;

type ProducerConfig = {
  exchangeName: string;
  exchangeType: (typeof ExchangeTypes)[keyof typeof ExchangeTypes];
  durable: boolean;
};

type RetryOptions = {
  maxRetries?: number;
  initialDelay?: number;
  backoffFactor?: number;
};

let channel: Channel | null = null;

const initializeChannel = async (config: ProducerConfig): Promise<Channel> => {
  if (channel) {
    return channel;
  }

  try {
    const connection = await getConnection();
    channel = await (connection as any).createChannel();

    if (!channel) {
      throw new Error('Failed to create channel');
    }

    await channel.assertExchange(config.exchangeName, config.exchangeType, {
      durable: config.durable
    });

    logger.info('RabbitMQ producer initialized', {
      meta: {
        exchangeName: config.exchangeName,
        exchangeType: config.exchangeType,
        durable: config.durable
      }
    });

    return channel;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to initialize RabbitMQ producer', {
      meta: {
        error: err.message,
        exchangeName: config.exchangeName
      }
    });
    throw err;
  }
};

export const publish = async (
  config: ProducerConfig,
  message: unknown,
  routingKey = '',
  options: Options.Publish = {}
): Promise<boolean> => {
  const ch = await initializeChannel(config);

  try {
    const messageBuffer = Buffer.from(JSON.stringify(message));
    const publishOptions = {
      persistent: true,
      priority: options.priority || 0,
      ...options
    };

    const result = ch.publish(config.exchangeName, routingKey, messageBuffer, publishOptions);

    if (result) {
      logger.debug('Message published successfully', {
        meta: {
          exchangeName: config.exchangeName,
          routingKey,
          messageSize: messageBuffer.length,
          priority: publishOptions.priority
        }
      });
    } else {
      logger.warn('Channel write buffer is full - backpressure being applied', {
        meta: {
          exchangeName: config.exchangeName,
          routingKey
        }
      });

      await new Promise<void>((resolve) => ch.once('drain', resolve));
    }

    return result;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to publish message', {
      meta: {
        error: err.message,
        exchangeName: config.exchangeName,
        routingKey
      }
    });
    throw err;
  }
};

export const publishWithRetry = async (
  config: ProducerConfig,
  message: unknown,
  routingKey = '',
  options: Options.Publish = {},
  retryOptions: RetryOptions = {}
): Promise<boolean> => {
  const maxRetries = retryOptions.maxRetries || 3;
  const initialDelay = retryOptions.initialDelay || 500;
  const factor = retryOptions.backoffFactor || 2;
  let attempt = 0;
  let delay = initialDelay;

  while (attempt <= maxRetries) {
    try {
      return await publish(config, message, routingKey, options);
    } catch (error) {
      attempt++;
      if (attempt > maxRetries) {
        throw error;
      }

      logger.warn(`Retrying publish (${attempt}/${maxRetries}) after ${delay}ms`, {
        meta: {
          exchangeName: config.exchangeName,
          routingKey
        }
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= factor;
    }
  }

  return false;
};

export const scheduleMessage = async (
  config: ProducerConfig,
  message: unknown,
  routingKey = '',
  delayMs = 0,
  options: Options.Publish = {}
): Promise<boolean> => {
  if (delayMs <= 0) {
    return publish(config, message, routingKey, options);
  }

  const delayedMessage = {
    originalMessage: message,
    originalRoutingKey: routingKey,
    originalExchange: config.exchangeName,
    publishOptions: options,
    executionTime: Date.now() + delayMs
  };

  return publish(config, delayedMessage, `delayed.${delayMs}`, {
    ...options,
    headers: { ...options.headers, 'x-delay': delayMs }
  });
};

export const closeChannel = async (): Promise<void> => {
  if (channel) {
    try {
      await channel.close();
      channel = null;
      logger.info('RabbitMQ producer channel closed');
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Error closing producer channel', {
        meta: {
          error: err.message
        }
      });
      throw err;
    }
  }
};

export const createProducerConfig = (
  exchangeName: string,
  exchangeType: (typeof ExchangeTypes)[keyof typeof ExchangeTypes] = ExchangeTypes.DIRECT,
  durable = true
): ProducerConfig => ({
  exchangeName,
  exchangeType,
  durable
});
