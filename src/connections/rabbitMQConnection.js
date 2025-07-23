import amqplib from 'amqplib';
import { logger } from '../utils/logger.js';

let connection = null;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_INTERVAL = 5000;
let isClosing = false;

const retryWithBackoff = async (fn, maxRetries = 5, initialDelay = 5000) => {
  let attempt = 0;

  const execute = async () => {
    try {
      attempt++;
      return await fn();
    } catch (error) {
      if (attempt >= maxRetries) {
        throw error;
      }
      const delay = initialDelay * Math.pow(2, attempt - 1);
      logger.info(`Retrying operation in ${delay / 1000} seconds... (${attempt}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return execute();
    }
  };

  return execute();
};

export const createConnection = async () => {
  if (connection) {
    return connection;
  }

  const rabbitmqUrl = process.env.RABBITMQ_URL;

  const connect = async () => {
    connectionAttempts++;
    logger.info('Connecting to RabbitMQ server...', {
      meta: {
        url: rabbitmqUrl.includes('@') ? rabbitmqUrl.replace(/:[^:]*@/, ':****@') : rabbitmqUrl,
        attempt: connectionAttempts
      }
    });

    connection = await amqplib.connect(rabbitmqUrl);
    connectionAttempts = 0;

    connection.on('close', (err) => {
      logger.warn('RabbitMQ connection closed', { meta: err });
      connection = null;
      setTimeout(
        () =>
          createConnection().catch((e) =>
            logger.error('Failed to reconnect to RabbitMQ', { meta: e })
          ),
        RETRY_INTERVAL
      );
    });

    connection.on('error', (err) => {
      logger.error('RabbitMQ connection error', { meta: err });
      connection = null;
    });

    logger.info('Successfully connected to RabbitMQ server');
    return connection;
  };

  return retryWithBackoff(connect, MAX_RETRY_ATTEMPTS, RETRY_INTERVAL);
};

export const getConnection = async () => {
  if (!connection) {
    return createConnection();
  }
  return connection;
};

export const closeConnection = async () => {
  if (!connection) {
    logger.info('No active RabbitMQ connection to close');
    return;
  }

  if (isClosing) {
    logger.info('RabbitMQ connection is already in the process of closing');
    return;
  }

  try {
    isClosing = true;
    await connection.close();
    connection = null;
    // logger.info('RabbitMQ connection closed successfully');
  } catch (err) {
    if (err.message && err.message.includes('Connection closing')) {
      logger.warn('RabbitMQ connection already closing', {
        meta: {
          message: err.message,
          name: err.name
        }
      });
      // Still mark the connection as null since it's going to be closed
      connection = null;
    } else {
      logger.error('Error closing RabbitMQ connection', {
        meta: {
          error: err.message,
          stack: err.stack,
          name: err.name
        }
      });
      // In case of unexpected errors, we should still set the connection to null
      // to avoid potential issues on next connection attempt
      connection = null;
      throw err;
    }
  } finally {
    isClosing = false;
  }
};
