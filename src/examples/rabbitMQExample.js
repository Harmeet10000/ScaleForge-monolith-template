import { ExchangeTypes, createProducer } from '../helpers/rabbitMQProducer.js';
import { createBoundConsumer, setupPriorityQueue } from '../helpers/rabbitMQConsumer.js';
import { logger } from '../utils/logger.js';
import { catchAsync } from '../utils/catchAsync.js';
import { closeConnection } from '../db/rabbitMQConnection.js';

/**
 * Example: Setting up a RabbitMQ producer
 *
 * This demonstrates creating and using a producer to send messages to different exchanges
 * with various routing patterns.
 */
export const setupProducer = catchAsync(async () => {
  // Create a producer for a direct exchange
  const directProducer = await createProducer('notifications', ExchangeTypes.DIRECT);
  logger.info('Direct producer created:', {
    meta: {
      exchange: 'notifications',
      type: ExchangeTypes.DIRECT
    }
  });

  // Send a message with a specific routing key
  await directProducer.publish(
    {
      type: 'email',
      recipient: 'user@example.com',
      subject: 'Welcome!',
      body: 'Welcome to our platform.'
    },
    'email.welcome' // Routing key
  );

  logger.info('Message sent to direct exchange');

  // Create a producer for a topic exchange (useful for hierarchical routing patterns)
  const topicProducer = await createProducer('logs', ExchangeTypes.TOPIC);
  logger.info('Topic producer created:', {
    meta: {
      exchange: 'logs',
      type: ExchangeTypes.TOPIC
    }
  });

  // Send a message with a topic routing pattern
  await topicProducer.publish(
    {
      level: 'error',
      service: 'auth',
      message: 'Authentication failed',
      timestamp: new Date().toISOString()
    },
    'service.auth.error' // Topic pattern: service.name.level
  );

  logger.info('Message sent to topic exchange');

  // Create a producer for a fanout exchange (broadcasts to all bound queues)
  const fanoutProducer = await createProducer('broadcasts', ExchangeTypes.FANOUT);

  // Send a broadcast message (routing key is ignored in fanout exchanges)
  await fanoutProducer.publish({
    type: 'system',
    message: 'System maintenance in 5 minutes',
    timestamp: new Date().toISOString()
  });

  logger.info('Message sent to fanout exchange');

  // Demonstrate retry mechanism
  logger.info('Demonstrating publish with retry...');
  try {
    await topicProducer.publishWithRetry(
      {
        level: 'warning',
        service: 'api',
        message: 'Rate limit approaching',
        timestamp: new Date().toISOString()
      },
      'service.api.warning',
      {}, // Standard options
      {
        maxRetries: 3,
        initialDelay: 100,
        backoffFactor: 2
      }
    );

    logger.info('Message published with retry configuration');
  } catch (error) {
    logger.error('Failed to publish message with retry', {
      meta: { error: error.message }
    });
  }

  // Demonstrate scheduled message
  logger.info('Demonstrating scheduled message...');
  await directProducer.scheduleMessage(
    {
      type: 'reminder',
      recipient: 'user@example.com',
      subject: 'Follow-up',
      body: "Don't forget to complete your profile!"
    },
    'email.reminder',
    5000 // Delay in milliseconds
  );

  logger.info('Scheduled message for delivery in 5 seconds');

  // Clean up
  await directProducer.close();
  await topicProducer.close();
  await fanoutProducer.close();

  return { success: true };
});

/**
 * Example: Setting up RabbitMQ consumers
 *
 * This demonstrates creating and using consumers to receive messages from queues
 * bound to different exchange types with various routing patterns.
 */
export const setupConsumers = catchAsync(async () => {
  // Create a consumer for direct exchange messages with retry configuration
  const emailConsumer = await createBoundConsumer(
    'email_notifications', // Queue name
    'notifications', // Exchange name
    'email.*', // Binding pattern (matches email.welcome, email.reminder, etc.)
    {
      queueOptions: {
        durable: true,
        deadLetterExchange: 'dead_letters' // Send failed messages to dead letter exchange
      }
    }
  );

  // Start consuming messages
  await emailConsumer.consume(
    async (message, originalMessage) => {
      logger.info(`Processing email notification: ${message.subject}`, {
        meta: { recipient: message.recipient }
      });

      // Process the message (in a real application, this would send an email)
      // If an error occurs, the message will be nacked and requeued by default

      // Example of accessing message properties from the original amqplib message
      logger.debug('Message metadata', {
        meta: {
          routingKey: originalMessage.fields.routingKey,
          headers: originalMessage.properties.headers || {}
        }
      });
    },
    {
      prefetch: 5 // Process 5 messages at a time
    }
  );

  // Create a consumer for topic exchange messages
  const errorLogConsumer = await createBoundConsumer(
    'error_logs', // Queue name
    'logs', // Exchange name
    'service.*.error' // Topic pattern: matches any service's error logs
  );

  await errorLogConsumer.consume(async (message) => {
    logger.info(`Processing error log from ${message.service}`, {
      meta: { level: message.level, message: message.message }
    });

    // Process the error log
  });

  // Create a consumer for fanout exchange messages (broadcasts)
  const systemAlertConsumer = await createBoundConsumer(
    'system_alerts', // Queue name
    'broadcasts', // Exchange name
    '' // Binding key is ignored for fanout exchanges
  );

  await systemAlertConsumer.consume(async (message) => {
    logger.info(`Received system broadcast: ${message.message}`, {
      meta: { type: message.type }
    });

    // Process the system alert
  });

  logger.info('All consumers set up and ready to receive messages');

  // In a real application, you wouldn't close these right away
  // This is just for demonstration purposes
  // After 10 seconds, stop all consumers
  setTimeout(async () => {
    await emailConsumer.close();
    await errorLogConsumer.close();
    await systemAlertConsumer.close();
    await closeConnection();
    logger.info('All consumers closed');
  }, 10000);

  return { success: true };
});

export const runTaskQueueExample = catchAsync(async () => {
  // Create a task producer that publishes to a direct exchange
  const taskProducer = await createProducer('tasks', ExchangeTypes.DIRECT);

  // Create a priority queue consumer
  const taskConsumer = await setupPriorityQueue('task_processor', 10, {
    durable: true
  });

  // Bind the queue to the exchange
  await taskConsumer.bindQueue('tasks', 'task.process');

  // Start consuming tasks
  await taskConsumer.consume(
    async (task) => {
      logger.info(`Processing task: ${task.id}`, {
        meta: {
          type: task.type,
          priority: task.priority
        }
      });

      // Simulate task processing time
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Simulate task result
      logger.info(`Task ${task.id} completed`);
    },
    {
      prefetch: 1 // Process only one task at a time
    }
  );

  // Send some tasks with different priorities
  for (let i = 1; i <= 5; i++) {
    const priority = Math.floor(Math.random() * 10);
    await taskProducer.publish(
      {
        id: `task-${i}`,
        type: 'data-processing',
        data: { value: Math.random() * 100 },
        priority
      },
      'task.process',
      {
        priority // Random priority 0-9
      }
    );

    logger.info(`Task ${i} sent with priority ${priority}`);
  }

  logger.info('All tasks sent to the queue');

  // Clean up after 5 seconds
  setTimeout(async () => {
    await taskProducer.close();
    await taskConsumer.close();
    logger.info('Task queue example completed');
  }, 5000);

  return { success: true };
});
