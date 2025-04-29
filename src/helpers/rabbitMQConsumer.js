import { getConnection } from '../db/rabbitMQConnection.js';
import { logger } from '../utils/logger.js';
import { ExchangeTypes } from './rabbitMQProducer.js';

export class RabbitMQConsumer {
  constructor(queueName, queueOptions = {}) {
    this.queueName = queueName;
    this.queueOptions = {
      durable: true,
      maxPriority: 10,
      ...queueOptions
    };
    this.channel = null;
    this.consumerTag = null;
    this.retryConfig = {
      enabled: true,
      maxRetries: 5,
      delays: [1000, 5000, 10000, 30000, 60000] // Increasingly delayed retries in ms
    };
    this.queueExists = false;
  }

  async initialize() {
    if (this.channel) {
      return;
    }

    try {
      const connection = await getConnection();
      this.channel = await connection.createChannel();

      // Check if queue already exists to avoid modifying existing configuration
      try {
        await this.channel.checkQueue(this.queueName);
        this.queueExists = true;
        logger.info('Queue already exists, using existing configuration', {
          meta: {
            queueName: this.queueName
          }
        });
      } catch (checkError) {
        // Queue doesn't exist, will be created with provided options

        this.queueExists = false;
      }

      // If queue exists, we assert it without changing its properties
      // If it doesn't exist, create it with the specified options
      await this.channel.assertQueue(this.queueName, this.queueExists ? {} : this.queueOptions);

      logger.info('RabbitMQ consumer initialized', {
        meta: {
          queueName: this.queueName,
          queueOptions: this.queueExists ? 'using existing configuration' : this.queueOptions
        }
      });
    } catch (error) {
      logger.error('Failed to initialize RabbitMQ consumer', {
        meta: {
          error: error.message,
          queueName: this.queueName
        }
      });
      throw error;
    }
  }

  async bindQueue(exchangeName, bindingKey = '', bindingOptions = {}) {
    if (!this.channel) {
      await this.initialize();
    }

    try {
      await this.channel.bindQueue(this.queueName, exchangeName, bindingKey, bindingOptions);

      logger.info('Queue bound to exchange', {
        meta: {
          queueName: this.queueName,
          exchangeName,
          bindingKey
        }
      });
    } catch (error) {
      logger.error('Failed to bind queue to exchange', {
        meta: {
          error: error.message,
          queueName: this.queueName,
          exchangeName,
          bindingKey
        }
      });
      throw error;
    }
  }

  async setupRetryQueue() {
    if (!this.retryConfig.enabled) {
      return;
    }

    try {
      // Don't modify queue configuration if it already exists
      if (this.queueExists) {
        logger.info('Queue already exists, skipping retry queue setup', {
          meta: {
            queueName: this.queueName
          }
        });
        return;
      }

      // Check if deadLetterExchange is already specified in queue options
      const deadLetterExchange = this.queueOptions.deadLetterExchange || `${this.queueName}.dlx`;
      const retryExchange = `${this.queueName}.retry`;
      const retryQueue = `${this.queueName}.retry`;

      await this.channel.assertExchange(deadLetterExchange, ExchangeTypes.DIRECT, {
        durable: true
      });
      await this.channel.assertExchange(retryExchange, ExchangeTypes.DIRECT, { durable: true });

      // Set up the main queue with DLX configuration
      await this.channel.assertQueue(this.queueName, {
        ...this.queueOptions,
        deadLetterExchange
      });

      // Set up the retry queue with TTL and DLX back to the main exchange
      await this.channel.assertQueue(retryQueue, {
        durable: true,
        deadLetterExchange: '',
        deadLetterRoutingKey: this.queueName
      });

      await this.channel.bindQueue(retryQueue, retryExchange, '');
      await this.channel.bindQueue(this.queueName, deadLetterExchange, '');

      logger.info('Retry mechanism configured for queue', {
        meta: {
          queueName: this.queueName,
          retryQueue,
          deadLetterExchange
        }
      });
    } catch (error) {
      logger.error('Failed to set up retry queue', {
        meta: {
          error: error.message,
          queueName: this.queueName
        }
      });
      throw error;
    }
  }

  async consume(messageHandler, consumeOptions = {}) {
    if (!this.channel) {
      await this.initialize();
    }

    // Set up retry mechanism if needed
    if (this.retryConfig.enabled && consumeOptions.setupRetryQueue !== false) {
      await this.setupRetryQueue();
    }

    // Set prefetch/QoS to prevent overwhelming the consumer
    const prefetch = consumeOptions.prefetch || 10;
    await this.channel.prefetch(prefetch);

    const options = {
      noAck: false,
      ...consumeOptions
    };

    // Remove non-amqplib options
    delete options.prefetch;
    delete options.setupRetryQueue;

    try {
      const { consumerTag } = await this.channel.consume(
        this.queueName,
        async (msg) => {
          if (!msg) {
            logger.warn('Consumer cancelled by server', {
              meta: { queueName: this.queueName }
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
                queueName: this.queueName,
                routingKey: msg.fields.routingKey,
                exchange: msg.fields.exchange,
                retryCount,
                priority: msg.properties.priority || 0
              }
            });

            // Process message with handler
            await messageHandler(content, msg);

            // Acknowledge message on success
            this.channel.ack(msg);
          } catch (error) {
            logger.error('Error processing message', {
              meta: {
                error: error.message,
                stack: error.stack,
                queueName: this.queueName,
                routingKey: msg.fields.routingKey
              }
            });

            const headers = msg.properties.headers || {};
            const retryCount = (headers['x-retry-count'] || 0) + 1;

            if (this.retryConfig.enabled && retryCount <= this.retryConfig.maxRetries) {
              // Get delay for current retry attempt
              const delayIndex = Math.min(retryCount - 1, this.retryConfig.delays.length - 1);
              const delay = this.retryConfig.delays[delayIndex];

              // Publish to retry exchange with TTL
              const retryExchange = `${this.queueName}.retry`;
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
                `Scheduling retry ${retryCount}/${this.retryConfig.maxRetries} in ${delay}ms`,
                {
                  meta: {
                    queueName: this.queueName,
                    retryCount
                  }
                }
              );

              this.channel.publish(retryExchange, '', msg.content, retryOptions);

              // Acknowledge original message
              this.channel.ack(msg);
            } else if (options.requeue !== false && !this.retryConfig.enabled) {
              // Simple requeue if retry mechanism is disabled
              this.channel.nack(msg, false, true);
            } else {
              // Max retries reached or requeue disabled, ack to remove from queue
              logger.warn('Discarding failed message after max retries', {
                meta: {
                  queueName: this.queueName,
                  retryCount
                }
              });
              this.channel.ack(msg);
            }
          }
        },
        options
      );

      this.consumerTag = consumerTag;

      logger.info('Started consuming messages', {
        meta: {
          queueName: this.queueName,
          consumerTag,
          prefetch,
          retryEnabled: this.retryConfig.enabled,
          maxRetries: this.retryConfig.maxRetries
        }
      });

      return consumerTag;
    } catch (error) {
      logger.error('Failed to start consuming messages', {
        meta: {
          error: error.message,
          queueName: this.queueName
        }
      });
      throw error;
    }
  }

  async stopConsuming() {
    if (this.channel && this.consumerTag) {
      try {
        await this.channel.cancel(this.consumerTag);
        this.consumerTag = null;
        logger.info('Stopped consuming messages', {
          meta: { queueName: this.queueName }
        });
      } catch (error) {
        logger.error('Error stopping consumer', {
          meta: {
            error: error.message,
            queueName: this.queueName
          }
        });
        throw error;
      }
    }
  }

  async close() {
    if (this.consumerTag) {
      await this.stopConsuming();
    }

    if (this.channel) {
      try {
        await this.channel.close();
        this.channel = null;
        logger.info('RabbitMQ consumer channel closed', {
          meta: { queueName: this.queueName }
        });
      } catch (error) {
        logger.error('Error closing consumer channel', {
          meta: {
            error: error.message,
            queueName: this.queueName
          }
        });
        throw error;
      }
    }
  }
}

export const createConsumer = async (queueName, queueOptions = {}) => {
  try {
    const consumer = new RabbitMQConsumer(queueName, queueOptions);
    await consumer.initialize();
    return consumer;
  } catch (error) {
    logger.error('Failed to create consumer', {
      meta: {
        error: error.message,
        queueName
      }
    });
    throw error;
  }
};

export const createBoundConsumer = async (
  queueName,
  exchangeName,
  bindingKey = '',
  options = {}
) => {
  try {
    const { queueOptions = {}, bindingOptions = {} } = options;

    const consumer = await createConsumer(queueName, queueOptions);
    await consumer.bindQueue(exchangeName, bindingKey, bindingOptions);

    return consumer;
  } catch (error) {
    logger.error('Failed to create bound consumer', {
      meta: {
        error: error.message,
        queueName,
        exchangeName,
        bindingKey
      }
    });
    throw error;
  }
};

export const setupPriorityQueue = async (queueName, maxPriority = 10, queueOptions = {}) => {
  try {
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
  } catch (error) {
    logger.error('Failed to set up priority queue', {
      meta: {
        error: error.message,
        queueName
      }
    });
    throw error;
  }
};
