import { ExchangeTypes, createProducer } from '../helpers/rabbitMQProducer.js';
import {
  createBoundConsumer,
  setupPriorityQueue,
  createConsumer
} from '../helpers/rabbitMQConsumer.js';
import { logger } from '../utils/logger.js';
import { catchAsync } from '../utils/catchAsync.js';
import { closeConnection } from '../db/rabbitMQConnection.js';

/**
 * Example: Setting up a RabbitMQ producer
 *
 * This demonstrates creating and using a producer to send messages to different exchanges
 * with various routing patterns and handling backpressure.
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
    'email.welcome', // Routing key
    {
      persistent: true,
      priority: 5 // Medium priority
    }
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
    'service.auth.error', // Topic pattern: service.name.level
    {
      headers: {
        'x-source': 'auth-service',
        'x-correlation-id': '12345'
      }
    }
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

  // Demonstrate retry mechanism with exponential backoff
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
      {
        headers: { 'x-critical': 'true' }
      },
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

  // Demonstrate scheduled message delivery
  logger.info('Demonstrating scheduled message...');
  await directProducer.scheduleMessage(
    {
      type: 'reminder',
      recipient: 'user@example.com',
      subject: 'Follow-up',
      body: "Don't forget to complete your profile!"
    },
    'email.reminder',
    5000, // Delay in milliseconds
    {
      headers: {
        'x-scheduled-by': 'example-service'
      }
    }
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
 * bound to different exchange types with various routing patterns and retry mechanisms.
 */
export const setupConsumers = catchAsync(async () => {
  // Create a consumer with custom retry configuration
  const emailConsumer = await createConsumer('email_notifications', {
    durable: true,
    maxPriority: 10
  });

  // Configure retry mechanism with custom delays
  const initializedState = emailConsumer.getState();
  initializedState.retryConfig = {
    enabled: true,
    maxRetries: 3,
    delays: [1000, 3000, 10000] // 1s, 3s, 10s
  };

  // Bind to exchange
  await emailConsumer.bindQueue('notifications', 'email.*');
  await emailConsumer.setupRetryQueue();

  // Start consuming messages
  await emailConsumer.consume(
    async (message, originalMessage) => {
      logger.info(`Processing email notification: ${message.subject}`, {
        meta: {
          recipient: message.recipient,
          priority: originalMessage.properties.priority || 0
        }
      });

      // Simulate processing the message
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Simulate random failures for retry demonstration (30% failure rate)
      if (Math.random() < 0.3) {
        throw new Error('Simulated random failure in email processing');
      }

      logger.info(`Email processed successfully: ${message.subject}`);
    },
    {
      prefetch: 5 // Process 5 messages at a time
    }
  );

  // Create a consumer for topic exchange messages
  const errorLogConsumer = await createBoundConsumer(
    'error_logs', // Queue name
    'logs', // Exchange name
    'service.*.error', // Topic pattern: matches any service's error logs
    {
      queueOptions: {
        durable: true
      }
    }
  );

  await errorLogConsumer.consume(async (message, originalMessage) => {
    logger.info(`Processing error log from ${message.service}`, {
      meta: {
        level: message.level,
        message: message.message,
        headers: originalMessage.properties.headers || {}
      }
    });

    // Process the error log
    await new Promise((resolve) => setTimeout(resolve, 100));
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
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  logger.info('All consumers set up and ready to receive messages');

  // In a real application, you wouldn't close these right away
  // This is just for demonstration purposes
  // After 15 seconds, stop all consumers
  setTimeout(async () => {
    logger.info('Stopping consumers...');
    await emailConsumer.close();
    await errorLogConsumer.close();
    await systemAlertConsumer.close();
    await closeConnection();
    logger.info('All consumers closed');
  }, 15000);

  return { success: true };
});

/**
 * Example: Priority Queue Implementation
 *
 * This demonstrates creating and using a priority queue for task processing
 * where higher priority tasks are processed first.
 */
export const runTaskQueueExample = catchAsync(async () => {
  // Create a task producer that publishes to a direct exchange
  const taskProducer = await createProducer('tasks', ExchangeTypes.DIRECT, true);

  // Create a priority queue consumer
  const taskConsumer = await setupPriorityQueue('task_processor', 10, {
    durable: true
  });

  // Bind the queue to the exchange
  await taskConsumer.bindQueue('tasks', 'task.process');

  // Start consuming tasks
  await taskConsumer.consume(
    async (task, originalMessage) => {
      const priority = originalMessage.properties.priority || 0;

      logger.info(`Processing task: ${task.id}`, {
        meta: {
          type: task.type,
          priority,
          processingTime: task.processingTime
        }
      });

      // Simulate task processing time based on complexity
      await new Promise((resolve) => setTimeout(resolve, task.processingTime));

      // Simulate occasional task failures based on complexity (harder tasks fail more often)
      const failureChance = task.complexity / 10;
      if (Math.random() < failureChance) {
        throw new Error(`Task ${task.id} failed during processing`);
      }

      // Task completed successfully
      logger.info(`Task ${task.id} completed successfully`, {
        meta: { priority }
      });
    },
    {
      prefetch: 2 // Process up to 2 tasks at a time
    }
  );

  // Send tasks with different priorities
  const tasks = [
    {
      id: 'task-1',
      type: 'data-processing',
      data: { value: 42 },
      priority: 9, // High priority
      complexity: 3,
      processingTime: 300
    },
    {
      id: 'task-2',
      type: 'report-generation',
      data: { reportId: 'daily-123' },
      priority: 5, // Medium priority
      complexity: 5,
      processingTime: 500
    },
    {
      id: 'task-3',
      type: 'data-cleanup',
      data: { table: 'logs' },
      priority: 2, // Low priority
      complexity: 2,
      processingTime: 200
    },
    {
      id: 'task-4',
      type: 'heavy-computation',
      data: { algorithm: 'matrix-multiply' },
      priority: 7, // High-medium priority
      complexity: 8,
      processingTime: 800
    },
    {
      id: 'task-5',
      type: 'notification',
      data: { userId: 'user-123' },
      priority: 8, // High priority
      complexity: 1,
      processingTime: 100
    }
  ];

  // Publish tasks in reverse order to demonstrate priority queue behavior
  for (const task of tasks) {
    await taskProducer.publish(task, 'task.process', {
      priority: task.priority,
      headers: {
        'x-task-type': task.type,
        'x-task-complexity': task.complexity.toString()
      }
    });

    logger.info(`Task ${task.id} sent with priority ${task.priority}`);
  }

  logger.info('All tasks sent to the queue - will be processed in priority order');

  // Allow time for tasks to be processed
  const processingTime = 8000; // 8 seconds
  logger.info(`Waiting ${processingTime / 1000} seconds for tasks to be processed...`);

  // Clean up after processing time
  setTimeout(async () => {
    await taskProducer.close();
    await taskConsumer.close();
    logger.info('Task queue example completed');
  }, processingTime);

  return { success: true, message: 'Priority task queue demonstration in progress' };
});

/**
 * Example: Dead Letter Exchange Implementation
 *
 * This demonstrates handling failed messages with a Dead Letter Exchange (DLX),
 * where messages that fail processing are sent to a separate queue for analysis.
 */
export const deadLetterExchangeExample = catchAsync(async () => {
  // Create an exchange for our main messages
  const mainProducer = await createProducer('orders', ExchangeTypes.DIRECT);

  // Create a consumer with explicit DLX configuration
  const orderConsumer = await createConsumer('order_processing', {
    durable: true,
    // Specify our own dead letter exchange
    deadLetterExchange: 'orders.dlx',
    // Route failed messages with the original routing key
    deadLetterRoutingKey: 'failed'
  });

  // Bind to the main exchange
  await orderConsumer.bindQueue('orders', 'new.order');

  // Create a consumer for the dead letter queue
  const dlxConsumer = await createConsumer('failed_orders', {
    durable: true
  });

  // Bind to the dead letter exchange
  await dlxConsumer.bindQueue('orders.dlx', 'failed');

  // Start consuming messages from the main queue
  await orderConsumer.consume(
    async (message, originalMessage) => {
      logger.info(`Processing order: ${message.orderId}, ${originalMessage}`, {
        meta: { customer: message.customer }
      });

      // Simulate processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Deliberately fail orders over $1000 to demonstrate DLX
      if (message.amount > 1000) {
        throw new Error('Order requires manual review due to high amount');
      }

      logger.info(`Order ${message.orderId} processed successfully`);
    },
    {
      // Important: we don't want to requeue directly, we want to use DLX
      requeue: false
    }
  );

  // Start consuming messages from the DLX queue
  await dlxConsumer.consume(async (message, originalMessage) => {
    logger.info(`Analyzing failed order: ${message.orderId}`, {
      meta: {
        amount: message.amount,
        headers: originalMessage.properties.headers || {}
      }
    });

    // In a real scenario, you might:
    // - Log details for manual review
    // - Send notifications to staff
    // - Route to specialized processing
    logger.info(`Order ${message.orderId} marked for manual review`);
  });

  // Send some test orders
  const orders = [
    { orderId: 'ORD-001', customer: 'customer1', items: ['item1', 'item2'], amount: 250 },
    { orderId: 'ORD-002', customer: 'customer2', items: ['item3'], amount: 1200 },
    { orderId: 'ORD-003', customer: 'customer3', items: ['item1', 'item4'], amount: 800 },
    { orderId: 'ORD-004', customer: 'customer4', items: ['item2', 'item5', 'item6'], amount: 1500 }
  ];

  // Publish orders
  for (const order of orders) {
    await mainProducer.publish(order, 'new.order');
    logger.info(`Order ${order.orderId} sent for processing, amount: $${order.amount}`);
  }

  logger.info('All orders published - some will be processed, some will go to DLX');

  // Clean up after allowing time for processing
  setTimeout(async () => {
    await mainProducer.close();
    await orderConsumer.close();
    await dlxConsumer.close();
    logger.info('Dead Letter Exchange example completed');
  }, 5000);

  return { success: true };
});
