import Kafka from 'node-rdkafka';
import { logger } from '../utils/logger.js';
import { catchAsync } from '../utils/catchAsync.js';

/**
 * Kafka Configuration
 */
const kafkaConfig = {
  'metadata.broker.list': process.env.KAFKA_BROKER || 'localhost:9092',
  'security.protocol': 'ssl',
  'ssl.key.location': process.env.KAFKA_SSL_KEY_LOCATION,
  'ssl.certificate.location': process.env.KAFKA_SSL_CERT_LOCATION,
  'ssl.ca.location': process.env.KAFKA_SSL_CA_LOCATION,
  'sasl.mechanisms': 'SCRAM-SHA-256',
  'sasl.username': process.env.KAFKA_USERNAME,
  'sasl.password': process.env.KAFKA_PASSWORD,
  'client.id': process.env.KAFKA_CLIENT_ID
  //   dr_cb: true // Enable delivery reports
};

/**
 * Producer Functions
 */
const createProducer = catchAsync(async () => {
  const producer = new Kafka.Producer(kafkaConfig);

  return new Promise((resolve, reject) => {
    producer.connect();

    producer.on('ready', () => {
      logger.info('Kafka Producer ready');
      resolve(producer);
    });

    producer.on('event.error', (err) => {
      logger.error('Kafka Producer error:', err);
      reject(err);
    });
  });
});

const disconnectProducer = catchAsync(async (producer) => {
  new Promise((resolve) => {
    producer.disconnect(() => {
      logger.info('Kafka Producer disconnected');
      resolve();
    });
  });
});

const sendMessage = catchAsync(async (producer, { topic, message, partition = 0 }) => {
  new Promise((resolve, reject) => {
    const value = typeof message === 'string' ? message : JSON.stringify(message);

    producer.produce(
      topic,
      partition,
      Buffer.from(value),
      null, // key
      Date.now(), // timestamp
      (err, offset) => {
        if (err) {
          logger.error('Failed to send message:', err);
          reject(err);
          return;
        }
        logger.info(`Message sent to topic ${topic} at offset ${offset}`);
        resolve(offset);
      }
    );

    producer.poll();
  });
});

/**
 * Consumer Functions
 */
const createConsumer = catchAsync(async ({ groupId }) => {
  const consumer = new Kafka.KafkaConsumer({
    ...kafkaConfig,
    'group.id': groupId || 'my-group',
    'enable.auto.commit': false
  });

  return new Promise((resolve, reject) => {
    consumer.connect();

    consumer.on('ready', () => {
      logger.info('Kafka Consumer ready');
      resolve(consumer);
    });

    consumer.on('event.error', (err) => {
      logger.error('Kafka Consumer error:', err);
      reject(err);
    });
  });
});

const subscribeToTopics = catchAsync(async (consumer, topics) => {
  consumer.subscribe(topics);
  logger.info(`Subscribed to topics: ${topics.join(', ')}`);
});

const startConsuming = catchAsync(async (consumer, messageHandler) => {
  consumer.consume();

  consumer.on('data', async (data) => {
    await messageHandler({
      topic: data.topic,
      partition: data.partition,
      offset: data.offset,
      value: data.value.toString(),
      timestamp: data.timestamp
    });

    consumer.commit(data);
  });
});

const disconnectConsumer = catchAsync(async (consumer) => {
  new Promise((resolve) => {
    consumer.disconnect(() => {
      logger.info('Kafka Consumer disconnected');
      resolve();
    });
  });
});

/**
 * Usage Examples
 */
const kafkaExamples = {
  producerExample: async () => {
    const producer = await createProducer();

    await sendMessage(producer, {
      topic: 'test-topic',
      message: { data: 'Hello Kafka!' }
    });

    await disconnectProducer(producer);
  },

  consumerExample: async () => {
    const consumer = await createConsumer({ groupId: 'my-group' });

    await subscribeToTopics(consumer, ['test-topic']);

    await startConsuming(consumer, async (message) => {
      logger.info('Received message:', message);
    });
  }
};
