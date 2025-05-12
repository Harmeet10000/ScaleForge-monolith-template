import {
  ExchangeTypes,
  publish,
  createProducerConfig,
  scheduleMessage
} from '../helpers/rabbitMQProducer.js';
import {
  createConsumer,
  consume,
  createBoundConsumer,
  setupPriorityQueue
} from '../helpers/rabbitMQConsumer.js';
import { logger } from '../utils/logger.js';
import { catchAsync } from '../utils/catchAsync.js';
import { closeConnection } from '../connections/connectRabbitMQ.js';

/**
 * Example: Using RabbitMQ producers
 *
 * This demonstrates sending messages to different exchanges with various routing patterns
 * using our functional approach.
 */
export const setupProducer = catchAsync(async () => {
  // Configure producers for different exchange types
  const notificationConfig = createProducerConfig('notifications', ExchangeTypes.DIRECT);
  const logsConfig = createProducerConfig('logs', ExchangeTypes.TOPIC);
  const broadcastConfig = createProducerConfig('broadcasts', ExchangeTypes.FANOUT);

  logger.info('Producer configs created', {
    meta: {
      exchanges: ['notifications', 'logs', 'broadcasts']
    }
  });

  // Send a message with a specific routing key
  await publish(
    notificationConfig,
    {
      type: 'email',
      recipient: 'user@example.com',
      subject: 'Welcome!',
      body: 'Welcome to our platform.'
    },
    'email.welcome'
  );

  logger.info('Message sent to direct exchange');

  // Send a message with a topic routing pattern
  await publish(
    logsConfig,
    {
      level: 'error',
      service: 'auth',
      message: 'Authentication failed',
      timestamp: new Date().toISOString()
    },
    'service.auth.error'
  );

  logger.info('Message sent to topic exchange');

  // Send a broadcast message (routing key is ignored in fanout exchanges)
  await publish(broadcastConfig, {
    type: 'system',
    message: 'System maintenance in 5 minutes',
    timestamp: new Date().toISOString()
  });

  logger.info('Message sent to fanout exchange');

  // Demonstrate scheduled message
  await scheduleMessage(
    notificationConfig,
    {
      type: 'reminder',
      recipient: 'user@example.com',
      subject: 'Follow-up',
      body: "Don't forget to complete your profile!"
    },
    'email.reminder',
    5000
  );

  logger.info('Scheduled message for delivery in 5 seconds');

  return { success: true };
});

/**
 * Example: Setting up RabbitMQ consumers
 *
 * This demonstrates receiving messages from queues bound to different exchange types
 * using our functional approach.
 */
export const setupConsumers = catchAsync(async () => {
  // Initialize consumers
  await createConsumer('email_notifications', {
    durable: true,
    deadLetterExchange: 'dead_letters'
  });

  await createConsumer('error_logs');
  await createConsumer('system_alerts');

  // Bind queues to their exchanges
  await createBoundConsumer('email_notifications', 'notifications', 'email.*', {
    queueOptions: {
      durable: true,
      deadLetterExchange: 'dead_letters'
    }
  });

  await createBoundConsumer('error_logs', 'logs', 'service.*.error');
  await createBoundConsumer('system_alerts', 'broadcasts', '');

  // Start consuming messages
  await consume(
    'email_notifications',
    async (message, originalMessage) => {
      logger.info(`Processing email notification: ${message.subject}`, {
        meta: { recipient: message.recipient }
      });

      logger.debug('Message metadata', {
        meta: {
          routingKey: originalMessage.fields.routingKey,
          headers: originalMessage.properties.headers || {}
        }
      });
    },
    { prefetch: 5 }
  );

  await consume('error_logs', async (message) => {
    logger.info(`Processing error log from ${message.service}`, {
      meta: { level: message.level, message: message.message }
    });
  });

  await consume('system_alerts', async (message) => {
    logger.info(`Received system broadcast: ${message.message}`, {
      meta: { type: message.type }
    });
  });

  logger.info('All consumers set up and ready to receive messages');

  // Clean up after 10 seconds
  setTimeout(async () => {
    await closeConnection();
    logger.info('All consumers closed');
  }, 10000);

  return { success: true };
});

export const runTaskQueueExample = catchAsync(async () => {
  // Create task queue configuration
  const taskConfig = createProducerConfig('tasks', ExchangeTypes.DIRECT);

  // Setup priority queue
  await setupPriorityQueue('task_processor', 10, {
    durable: true
  });

  // Bind queue to exchange
  await createBoundConsumer('task_processor', 'tasks', 'task.process');

  // Start consuming tasks
  await consume(
    'task_processor',
    async (task) => {
      logger.info(`Processing task: ${task.id}`, {
        meta: {
          type: task.type,
          priority: task.priority
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 500));
      logger.info(`Task ${task.id} completed`);
    },
    { prefetch: 1 }
  );

  // Send tasks with different priorities
  for (let i = 1; i <= 5; i++) {
    const priority = Math.floor(Math.random() * 10);
    await publish(
      taskConfig,
      {
        id: `task-${i}`,
        type: 'data-processing',
        data: { value: Math.random() * 100 },
        priority
      },
      'task.process',
      { priority }
    );

    logger.info(`Task ${i} sent with priority ${priority}`);
  }

  logger.info('All tasks sent to the queue');

  // Clean up after 5 seconds
  setTimeout(async () => {
    await closeConnection();
    logger.info('Task queue example completed');
  }, 5000);

  return { success: true };
});
