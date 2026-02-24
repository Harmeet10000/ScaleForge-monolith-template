import amqplib from 'amqplib';
import { logger } from '../utils/logger.js';
import asyncHandler from 'express-async-handler';

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

export const disconnectRabbitMQ = asyncHandler(async () => {
  if (!connection) {
    logger.info('No active RabbitMQ connection to close');
    return;
  }

  if (isClosing) {
    logger.info('RabbitMQ connection is already in the process of closing');
    return;
  }

  isClosing = true;
  await connection.close();
  connection = null;
  isClosing = false;
});

// import { Connection } from 'rabbitmq-client';
// import { logger } from '../utils/logger.js';
// import asyncHandler from 'express-async-handler';

// let rabbit = null;

// export const getRabbitMQ = async () => {
//   if (rabbit) return rabbit;

//   const url = process.env.RABBITMQ_URL;

//   rabbit = new Connection({
//     url,
//     // Recommended defaults for resilience
//     reconnect: true,                    // auto reconnect (default)
//     reconnectInterval: 5000,            // initial delay
//     maxReconnectAttempts: 0,            // 0 = infinite (with backoff)
//     // Or custom backoff strategy
//     // reconnectBackoff: { min: 1000, max: 30000, factor: 2, jitter: 0.2 }
//     heartbeat: 30,                      // seconds
//     // publish retries (useful later)
//     confirm: true,
//     maxRetries: 3,
//   });

//   // Logging integration
//   rabbit.on('connection', () => {
//     logger.info('Connected to RabbitMQ');
//   });

//   rabbit.on('error', (err, where) => {
//     logger.error(`RabbitMQ error in ${where}`, { error: err });
//   });

//   rabbit.on('disconnect', ({ reason }) => {
//     logger.warn('RabbitMQ disconnected', { reason });
//   });

//   // Wait for first successful connection (optional but recommended)
//   await rabbit.connect();

//   return rabbit;
// };

// // Usage example (in your services/consumers)
// const rabbit = await getRabbitMQ();
// const publisher = rabbit.createPublisher({ confirm: true });

// // Or create consumer with auto re-subscribe on reconnect
// rabbit.createConsumer(
//   { queue: 'my-queue', queueOptions: { durable: true } },
//   async (msg) => { /* handle */ }
// );

// // Graceful shutdown
// export const disconnectRabbitMQ = asyncHandler(async () => {
//   if (!rabbit) return;
//   await rabbit.close();
//   rabbit = null;
//   logger.info('RabbitMQ connection closed');
// });
