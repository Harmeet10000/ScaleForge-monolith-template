import { getConnection } from '../db/rabbitMQConnection.js';
import { logger } from '../utils/logger.js';
import { catchAsync } from '../utils/catchAsync.js';

/**
 * RabbitMQ Exchange Types
 */
export const ExchangeTypes = {
  DIRECT: 'direct',
  FANOUT: 'fanout',
  TOPIC: 'topic',
  HEADERS: 'headers'
};

/**
 * RabbitMQ Producer Class
 * Handles publishing messages to RabbitMQ exchanges
 */
export class RabbitMQProducer {
  /**
   * Constructor for RabbitMQProducer
   * @param {string} exchangeName - Name of the exchange
   * @param {string} exchangeType - Type of exchange (direct, fanout, topic, headers)
   * @param {boolean} durable - Whether the exchange should survive broker restarts
   */
  constructor(exchangeName, exchangeType = ExchangeTypes.DIRECT, durable = true) {
    this.exchangeName = exchangeName;
    this.exchangeType = exchangeType;
    this.durable = durable;
    this.channel = null;
  }

  /**
   * Initialize the producer by creating a channel and asserting the exchange
   * @returns {Promise<void>}
   */
  initialize = catchAsync(async () => {
    if (this.channel) {
      return;
    }

    const connection = await getConnection();
    this.channel = await connection.createChannel();

    // Assert exchange exists
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
  });

  /**
   * Publish a message to the exchange
   * @param {any} message - Message to publish (will be serialized to JSON)
   * @param {string} routingKey - Routing key for the message
   * @param {Object} options - Additional options for publishing
   * @returns {Promise<boolean>} - True if publishing was successful
   */
  publish = catchAsync(async (message, routingKey = '', options = {}) => {
    if (!this.channel) {
      await this.initialize();
    }

    const messageBuffer = Buffer.from(JSON.stringify(message));

    const publishOptions = {
      persistent: true, // Make messages persistent by default
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
          messageSize: messageBuffer.length
        }
      });
    } else {
      logger.warn('Channel write buffer is full - backpressure being applied', {
        meta: {
          exchangeName: this.exchangeName,
          routingKey
        }
      });
      // Wait for drain event before sending more messages
      await new Promise((resolve) => this.channel.once('drain', resolve));
    }

    return result;
  });

  /**
   * Close the producer channel
   * @returns {Promise<void>}
   */
  close = catchAsync(async () => {
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
      logger.info('RabbitMQ producer channel closed', {
        meta: { exchangeName: this.exchangeName }
      });
    }
  });
}

/**
 * RabbitMQ Consumer Class
 * Handles consuming messages from RabbitMQ queues
 */
export class RabbitMQConsumer {
  /**
   * Constructor for RabbitMQConsumer
   * @param {string} queueName - Name of the queue to consume from
   * @param {Object} queueOptions - Options for queue declaration
   */
  constructor(queueName, queueOptions = {}) {
    this.queueName = queueName;
    this.queueOptions = {
      durable: true, // Survive broker restarts
      ...queueOptions
    };
    this.channel = null;
    this.consumerTag = null;
  }

  /**
   * Initialize the consumer by creating a channel and asserting the queue
   * @returns {Promise<void>}
   */
  initialize = catchAsync(async () => {
    if (this.channel) {
      return;
    }

    const connection = await getConnection();
    this.channel = await connection.createChannel();

    // Assert queue exists
    await this.channel.assertQueue(this.queueName, this.queueOptions);

    logger.info('RabbitMQ consumer initialized', {
      meta: {
        queueName: this.queueName,
        queueOptions: this.queueOptions
      }
    });
  });

  /**
   * Bind the queue to an exchange with a binding key
   * @param {string} exchangeName - Name of the exchange to bind to
   * @param {string} bindingKey - Binding key to use
   * @param {Object} bindingOptions - Additional binding options
   * @returns {Promise<void>}
   */
  bindQueue = catchAsync(async (exchangeName, bindingKey = '', bindingOptions = {}) => {
    if (!this.channel) {
      await this.initialize();
    }

    await this.channel.bindQueue(this.queueName, exchangeName, bindingKey, bindingOptions);

    logger.info('Queue bound to exchange', {
      meta: {
        queueName: this.queueName,
        exchangeName,
        bindingKey
      }
    });
  });

  /**
   * Start consuming messages from the queue
   * @param {Function} messageHandler - Function to handle incoming messages
   * @param {Object} consumeOptions - Options for message consumption
   * @returns {Promise<string>} - Consumer tag
   */
  consume = catchAsync(async (messageHandler, consumeOptions = {}) => {
    if (!this.channel) {
      await this.initialize();
    }

    // Set prefetch/QoS to prevent overwhelming the consumer
    const prefetch = consumeOptions.prefetch || 10;
    await this.channel.prefetch(prefetch);

    const options = {
      noAck: false, // Require explicit acknowledgements
      ...consumeOptions
    };

    // Remove prefetch as it's not a valid consume option
    delete options.prefetch;

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
          // Parse the message content
          const content = JSON.parse(msg.content.toString());

          logger.debug('Received message', {
            meta: {
              queueName: this.queueName,
              routingKey: msg.fields.routingKey,
              exchange: msg.fields.exchange
            }
          });

          // Process the message with the provided handler
          await messageHandler(content, msg);

          // Acknowledge the message
          this.channel.ack(msg);
        } catch (err) {
          logger.error('Error processing message', {
            meta: {
              error: err,
              queueName: this.queueName,
              routingKey: msg.fields.routingKey
            }
          });

          // Handle message processing errors according to options
          if (options.requeue !== false) {
            // Negative acknowledgement, requeue the message
            this.channel.nack(msg, false, true);
          } else {
            // Don't requeue, acknowledge the message to remove from queue
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
        prefetch
      }
    });

    return consumerTag;
  });

  /**
   * Stop consuming messages
   * @returns {Promise<void>}
   */
  stopConsuming = catchAsync(async () => {
    if (this.channel && this.consumerTag) {
      await this.channel.cancel(this.consumerTag);
      this.consumerTag = null;
      logger.info('Stopped consuming messages', {
        meta: { queueName: this.queueName }
      });
    }
  });

  /**
   * Close the consumer channel
   * @returns {Promise<void>}
   */
  close = catchAsync(async () => {
    if (this.consumerTag) {
      await this.stopConsuming();
    }

    if (this.channel) {
      await this.channel.close();
      this.channel = null;
      logger.info('RabbitMQ consumer channel closed', {
        meta: { queueName: this.queueName }
      });
    }
  });
}

/**
 * Helper function to create a producer with standard error handling
 * @param {string} exchangeName - Name of the exchange
 * @param {string} exchangeType - Type of exchange (direct, fanout, topic, headers)
 * @param {boolean} durable - Whether the exchange should survive broker restarts
 * @returns {Promise<RabbitMQProducer>} - Configured producer instance
 */
export const createProducer = catchAsync(
  async (exchangeName, exchangeType = ExchangeTypes.DIRECT, durable = true) => {
    const producer = new RabbitMQProducer(exchangeName, exchangeType, durable);
    await producer.initialize();
    return producer;
  }
);

/**
 * Helper function to create a consumer with standard error handling
 * @param {string} queueName - Name of the queue
 * @param {Object} queueOptions - Options for queue declaration
 * @returns {Promise<RabbitMQConsumer>} - Configured consumer instance
 */
export const createConsumer = catchAsync(async (queueName, queueOptions = {}) => {
  const consumer = new RabbitMQConsumer(queueName, queueOptions);
  await consumer.initialize();
  return consumer;
});

/**
 * Helper function to create and bind a consumer to an exchange
 * @param {string} queueName - Name of the queue
 * @param {string} exchangeName - Name of the exchange
 * @param {string} bindingKey - Binding key to use
 * @param {Object} options - Combined queue and binding options
 * @returns {Promise<RabbitMQConsumer>} - Configured and bound consumer instance
 */
export const createBoundConsumer = catchAsync(
  async (queueName, exchangeName, bindingKey = '', options = {}) => {
    const { queueOptions = {}, bindingOptions = {} } = options;

    const consumer = await createConsumer(queueName, queueOptions);
    await consumer.bindQueue(exchangeName, bindingKey, bindingOptions);

    return consumer;
  }
);
