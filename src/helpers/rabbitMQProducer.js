import { getConnection } from '../db/rabbitMQConnection.js';
import { logger } from '../utils/logger.js';

export const ExchangeTypes = {
  DIRECT: 'direct',
  FANOUT: 'fanout',
  TOPIC: 'topic',
  HEADERS: 'headers'
};

export class RabbitMQProducer {
  constructor(exchangeName, exchangeType = ExchangeTypes.DIRECT, durable = true) {
    this.exchangeName = exchangeName;
    this.exchangeType = exchangeType;
    this.durable = durable;
    this.channel = null;
  }

  async initialize() {
    if (this.channel) {
      return;
    }

    try {
      const connection = await getConnection();
      this.channel = await connection.createChannel();

      await this.channel.assertExchange(this.exchangeName, this.exchangeType, {
        durable: this.durable
      });

      logger.info('RabbitMQ producer initialized', {
        meta: {
          exchangeName: this.exchangeName,
          exchangeType: this.exchangeType,
          durable: this.durable
        }
      });
    } catch (error) {
      logger.error('Failed to initialize RabbitMQ producer', {
        meta: {
          error: error.message,
          exchangeName: this.exchangeName
        }
      });
      throw error;
    }
  }

  async publish(message, routingKey = '', options = {}) {
    if (!this.channel) {
      await this.initialize();
    }

    try {
      const messageBuffer = Buffer.from(JSON.stringify(message));

      const publishOptions = {
        persistent: true,
        priority: options.priority || 0,
        ...options
      };

      const result = this.channel.publish(
        this.exchangeName,
        routingKey,
        messageBuffer,
        publishOptions
      );

      if (result) {
        logger.debug('Message published successfully', {
          meta: {
            exchangeName: this.exchangeName,
            routingKey,
            messageSize: messageBuffer.length,
            priority: publishOptions.priority
          }
        });
      } else {
        logger.warn('Channel write buffer is full - backpressure being applied', {
          meta: {
            exchangeName: this.exchangeName,
            routingKey
          }
        });
        await new Promise((resolve) => this.channel.once('drain', resolve));
      }

      return result;
    } catch (error) {
      logger.error('Failed to publish message', {
        meta: {
          error: error.message,
          exchangeName: this.exchangeName,
          routingKey
        }
      });
      throw error;
    }
  }

  async publishWithRetry(message, routingKey = '', options = {}, retryOptions = {}) {
    const delayExecution = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const maxRetries = retryOptions.maxRetries || 3;
    const initialDelay = retryOptions.initialDelay || 500;
    const factor = retryOptions.backoffFactor || 2;

    let attempt = 0;
    let delay = initialDelay;

    while (attempt <= maxRetries) {
      try {
        return await this.publish(message, routingKey, options);
      } catch (error) {
        attempt++;

        if (attempt > maxRetries) {
          logger.error('Max retries reached when publishing message', {
            meta: {
              error: error.message,
              exchangeName: this.exchangeName,
              routingKey,
              attempts: attempt
            }
          });
          throw error;
        }

        logger.warn(`Retrying publish (${attempt}/${maxRetries}) after ${delay}ms`, {
          meta: {
            exchangeName: this.exchangeName,
            routingKey
          }
        });
        await delayExecution(delay);
        await new Promise(
          (
            (currentDelay) => (resolve) =>
              setTimeout(resolve, currentDelay)
          )(delay)
        );
        delay *= factor;
      }
    }
  }

  async scheduleMessage(message, routingKey = '', delayMs = 0, options = {}) {
    if (delayMs <= 0) {
      return this.publish(message, routingKey, options);
    }

    const delayedMessage = {
      originalMessage: message,
      originalRoutingKey: routingKey,
      originalExchange: this.exchangeName,
      publishOptions: options,
      executionTime: Date.now() + delayMs
    };

    return this.publish(delayedMessage, `delayed.${delayMs}`, {
      ...options,
      headers: { ...options.headers, 'x-delay': delayMs }
    });
  }

  async close() {
    if (this.channel) {
      try {
        await this.channel.close();
        this.channel = null;
        logger.info('RabbitMQ producer channel closed', {
          meta: { exchangeName: this.exchangeName }
        });
      } catch (error) {
        logger.error('Error closing producer channel', {
          meta: {
            error: error.message,
            exchangeName: this.exchangeName
          }
        });
        throw error;
      }
    }
  }
}

export const createProducer = async (
  exchangeName,
  exchangeType = ExchangeTypes.DIRECT,
  durable = true
) => {
  try {
    const producer = new RabbitMQProducer(exchangeName, exchangeType, durable);
    await producer.initialize();
    return producer;
  } catch (error) {
    logger.error('Failed to create producer', {
      meta: {
        error: error.message,
        exchangeName
      }
    });
    throw error;
  }
};
