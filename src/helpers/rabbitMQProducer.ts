import { getConnection } from '../db/rabbitMQConnection';
import { logger } from '../utils/logger';
import { Channel, Options } from 'amqplib';

export const ExchangeTypes = {
  DIRECT: 'direct',
  FANOUT: 'fanout',
  TOPIC: 'topic',
  HEADERS: 'headers'
};

export class RabbitMQProducer {
  private exchangeName: string;
  private exchangeType: string;
  private durable: boolean;
  private channel: Channel | null;

  constructor(
    exchangeName: string,
    exchangeType: string = ExchangeTypes.DIRECT,
    durable: boolean = true
  ) {
    this.exchangeName = exchangeName;
    this.exchangeType = exchangeType;
    this.durable = durable;
    this.channel = null;
  }

  async initialize(): Promise<void> {
    if (this.channel) {
      return;
    }

    try {
      const connection = await getConnection();
      // Cast the connection to any to bypass the TypeScript error
      this.channel = await (connection as any).createChannel();

      if (!this.channel) {
        throw new Error('Failed to create channel');
      }

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
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to initialize RabbitMQ producer', {
        meta: {
          error: err.message,
          exchangeName: this.exchangeName
        }
      });
      throw err;
    }
  }

  async publish(
    message: any,
    routingKey: string = '',
    options: Options.Publish = {}
  ): Promise<boolean> {
    if (!this.channel) {
      await this.initialize();
    }

    try {
      if (!this.channel) {
        throw new Error('Channel is not initialized');
      }

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

        if (this.channel) {
          await new Promise<void>((resolve) => this.channel!.once('drain', resolve));
        }
      }

      return result;
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('Failed to publish message', {
        meta: {
          error: err.message,
          exchangeName: this.exchangeName,
          routingKey
        }
      });
      throw err;
    }
  }

  async publishWithRetry(
    message: any,
    routingKey: string = '',
    options: Options.Publish = {},
    retryOptions: { maxRetries?: number; initialDelay?: number; backoffFactor?: number } = {}
  ): Promise<boolean> {
    const delayExecution = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
    const maxRetries = retryOptions.maxRetries || 3;
    const initialDelay = retryOptions.initialDelay || 500;
    const factor = retryOptions.backoffFactor || 2;

    let attempt = 0;
    let delay = initialDelay;

    while (attempt <= maxRetries) {
      try {
        return await this.publish(message, routingKey, options);
      } catch (error: unknown) {
        attempt++;

        if (attempt > maxRetries) {
          const err = error instanceof Error ? error : new Error(String(error));
          logger.error('Max retries reached when publishing message', {
            meta: {
              error: err.message,
              exchangeName: this.exchangeName,
              routingKey,
              attempts: attempt
            }
          });
          throw err;
        }

        logger.warn(`Retrying publish (${attempt}/${maxRetries}) after ${delay}ms`, {
          meta: {
            exchangeName: this.exchangeName,
            routingKey
          }
        });
        await delayExecution(delay);
        delay *= factor;
      }
    }

    // This should never be reached but is needed to satisfy TypeScript's return type checking
    return false;
  }

  async scheduleMessage(
    message: any,
    routingKey: string = '',
    delayMs: number = 0,
    options: Options.Publish = {}
  ): Promise<boolean> {
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

  async close(): Promise<void> {
    if (this.channel) {
      try {
        await this.channel.close();
        this.channel = null;
        logger.info('RabbitMQ producer channel closed', {
          meta: { exchangeName: this.exchangeName }
        });
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Error closing producer channel', {
          meta: {
            error: err.message,
            exchangeName: this.exchangeName
          }
        });
        throw err;
      }
    }
  }
}

export const createProducer = async (
  exchangeName: string,
  exchangeType: string = ExchangeTypes.DIRECT,
  durable: boolean = true
): Promise<RabbitMQProducer> => {
  try {
    const producer = new RabbitMQProducer(exchangeName, exchangeType, durable);
    await producer.initialize();
    return producer;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('Failed to create producer', {
      meta: {
        error: err.message,
        exchangeName
      }
    });
    throw err;
  }
};
