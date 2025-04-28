import amqplib from 'amqplib';
import { logger } from '../utils/logger.js';

let connection = null;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_INTERVAL = 5000; // 5 seconds

export const createConnection = async () => {
  if (connection) {
    return connection;
  }

  const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

  try {
    connectionAttempts++;
    logger.info('Connecting to RabbitMQ server...', {
      meta: { url: rabbitmqUrl.replace(/:[^:]*@/, ':****@'), attempt: connectionAttempts }
    });

    connection = await amqplib.connect(rabbitmqUrl);
    connectionAttempts = 0;

    // Handle connection close and attempt reconnection
    connection.on('close', (err) => {
      logger.warn('RabbitMQ connection closed', { meta: err });
      connection = null;

      // Attempt to reconnect after delay
      setTimeout(async () => {
        try {
          await createConnection();
        } catch (reconnectErr) {
          logger.error('Failed to reconnect to RabbitMQ', { meta: reconnectErr });
        }
      }, RETRY_INTERVAL);
    });

    // Handle connection errors
    connection.on('error', (err) => {
      logger.error('RabbitMQ connection error', { meta: err });
      connection = null;
    });

    logger.info('Successfully connected to RabbitMQ server');
    return connection;
  } catch (err) {
    logger.error('Failed to connect to RabbitMQ', { meta: err });

    // Implement retry logic with exponential backoff
    if (connectionAttempts < MAX_RETRY_ATTEMPTS) {
      const retryDelay = RETRY_INTERVAL * Math.pow(2, connectionAttempts - 1);
      logger.info(`Retrying connection in ${retryDelay / 1000} seconds...`);

      return new Promise((resolve, reject) => {
        setTimeout(async () => {
          try {
            const conn = await createConnection();
            resolve(conn);
          } catch (retryErr) {
            reject(retryErr);
          }
        }, retryDelay);
      });
    }

    throw err;
  }
};

/**
 * Gets an existing connection or creates a new one
 * @returns {Promise<import('amqplib').Connection>} RabbitMQ Connection
 */
export const getConnection = async () => {
  if (!connection) {
    return createConnection();
  }
  return connection;
};

/**
 * Closes the RabbitMQ connection
 * @returns {Promise<void>}
 */
export const closeConnection = async () => {
  if (connection) {
    try {
      await connection.close();
      connection = null;
      logger.info('RabbitMQ connection closed successfully');
    } catch (err) {
      logger.error('Error closing RabbitMQ connection', { meta: err });
      connection = null;
      throw err;
    }
  }
};
