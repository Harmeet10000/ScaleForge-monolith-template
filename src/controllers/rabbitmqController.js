// filepath: /home/harmeet/Desktop/Projects/Production-grade-Auth-template/backend/src/controllers/rabbitmqController.js
import { logger } from '../utils/logger.js';
import { catchAsync } from '../utils/catchAsync.js';
import { httpResponse } from '../utils/httpResponse.js';
import { setupProducer, setupConsumers, runTaskQueueExample } from '../examples/rabbitMQExample.js';
import { SUCCESS } from '../constant/responseMessage.js';

// Store active consumers for demonstration purposes
const activeConsumers = {
  count: 0,
  lastStarted: null,
  status: 'inactive'
};

/**
 * Send a message using RabbitMQ producer
 * This endpoint demonstrates the producer functionality by sending test messages
 */
export const sendMessage = catchAsync(async (req, res, next) => {
  logger.info('Setting up RabbitMQ producer and sending test messages');

  const result = await setupProducer();

  activeConsumers.lastProducer = new Date().toISOString();

  return httpResponse(req, res, 200, 'Successfully sent test messages using RabbitMQ producer', {
    success: SUCCESS,
    result,
    timestamp: new Date().toISOString()
  });
});

/**
 * Start consuming messages using RabbitMQ consumers
 * This endpoint demonstrates the consumer functionality
 */
export const startConsumer = catchAsync(async (req, res, next) => {
  logger.info('Setting up RabbitMQ consumers for test messages');

  const result = await setupConsumers();

  activeConsumers.count++;
  activeConsumers.lastStarted = new Date().toISOString();
  activeConsumers.status = 'active';

  return httpResponse(req, res, 200, 'Successfully started RabbitMQ consumers', {
    success: SUCCESS,
    result,
    consumersActive: activeConsumers.count,
    timestamp: activeConsumers.lastStarted
  });
});

/**
 * Run a task queue example with priority support
 * This endpoint demonstrates a complete producer/consumer workflow with priority
 */
export const runTaskQueue = catchAsync(async (req, res, next) => {
  logger.info('Running RabbitMQ task queue example');

  const result = await runTaskQueueExample();

  return httpResponse(req, res, 200, 'Successfully executed RabbitMQ task queue example', {
    success: SUCCESS,
    result,
    timestamp: new Date().toISOString()
  });
});

/**
 * Get status of RabbitMQ consumer operations
 */
export const getStatus = catchAsync(async (req, res, next) => {
  httpResponse(req, res, 200, 'RabbitMQ status retrieved successfully', {
    consumers: activeConsumers,
    timestamp: new Date().toISOString()
  });
});
