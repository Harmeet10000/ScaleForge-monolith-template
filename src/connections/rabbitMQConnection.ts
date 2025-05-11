import amqplib, { Connection as AmqpConnection } from 'amqplib';
import config from '../config/dotenvConfig';
import { logger } from '../utils/logger';

// Define a custom type that extends the amqplib Connection interface
type Connection = AmqpConnection & {
  close(): Promise<void>;
};

let connection: Connection | null = null;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_INTERVAL = 5000;
let isClosing = false;

const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries = MAX_RETRY_ATTEMPTS,
  initialDelay = RETRY_INTERVAL
): Promise<T> => {
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

export const createConnection = async (): Promise<Connection> => {
  if (connection) {
    return connection;
  }

  const rabbitmqUrl = config.RABBITMQ_URL || 'amqp://localhost';

  const connect = async (): Promise<Connection> => {
    connectionAttempts++;
    logger.info('Connecting to RabbitMQ server...', {
      meta: {
        url: rabbitmqUrl.includes('@') ? rabbitmqUrl.replace(/:[^:]*@/, ':****@') : rabbitmqUrl,
        attempt: connectionAttempts
      }
    });

    // Cast the connection to our extended type
    const newConnection = (await amqplib.connect(rabbitmqUrl)) as unknown as Connection;
    connectionAttempts = 0;

    newConnection.on('close', (err) => {
      // logger.warn('RabbitMQ connection closed', { meta: err });
      connection = null;
      setTimeout(
        () =>
          createConnection().catch((e) =>
            logger.error('Failed to reconnect to RabbitMQ', { meta: e })
          ),
        RETRY_INTERVAL
      );
    });

    newConnection.on('error', (err) => {
      logger.error('RabbitMQ connection error', { meta: err });
      connection = null;
    });

    logger.info('Successfully connected to RabbitMQ server');
    return newConnection;
  };

  connection = await retryWithBackoff(connect, MAX_RETRY_ATTEMPTS, RETRY_INTERVAL);
  return connection;
};

export const getConnection = async (): Promise<Connection> => {
  if (!connection) {
    return createConnection();
  }
  return connection;
};

export const closeConnection = async (): Promise<void> => {
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
  } catch (err: unknown) {
    const error = err as Error;
    if (error.message && error.message.includes('Connection closing')) {
      logger.warn('RabbitMQ connection already closing', {
        meta: {
          message: error.message,
          name: error.name || 'Unknown'
        }
      });
      // Still mark the connection as null since it's going to be closed
      connection = null;
    } else {
      logger.error('Error closing RabbitMQ connection', {
        meta: {
          error: error.message || String(err),
          stack: error.stack || 'No stack trace',
          name: error.name || 'Unknown'
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
