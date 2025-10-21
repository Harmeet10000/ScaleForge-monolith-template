import { Kafka, logLevel } from 'kafkajs';
import 'dotenv/config';
import { logger } from '../utils/logger.js';
import asyncHandler from 'express-async-handler';

const TOPIC_NAME = process.env.KAFKA_TOPIC || 'chats';

const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'auth-service',
  brokers: (process.env.KAFKA_BROKER || 'localhost:9092').split(','),
  ssl: process.env.KAFKA_SSL === 'true',
  sasl:
    process.env.KAFKA_USERNAME && process.env.KAFKA_PASSWORD
      ? {
          mechanism: process.env.KAFKA_SASL_MECHANISM || 'scram-sha-256',
          username: process.env.KAFKA_USERNAME,
          password: process.env.KAFKA_PASSWORD
        }
      : undefined,
  logLevel: logLevel.ERROR
});

export const producer = kafka.producer();
export const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || 'chats' });

export const connectKafkaProducer = asyncHandler(async () => {
  await producer.connect();
  logger.info('KafkaJS Producer connected');
  return producer;
});

export const connectKafkaConsumer = asyncHandler(
  async (topic = TOPIC_NAME, fromBeginning = true) => {
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning });
    logger.info(`KafkaJS Consumer connected and subscribed to topic: ${topic}`);
    return consumer;
  }
);

export const disconnectKafka = asyncHandler(async () => {
  await producer.disconnect();
  await consumer.disconnect();
  logger.info('KafkaJS Producer and Consumer disconnected');
});

// import { Kafka } from 'kafkajs';
// import path from 'path';
// import fs from 'fs';
// import { fileURLToPath } from 'url';
// import 'dotenv/config';
// import { logger } from '../utils/logger.js';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__import { asyncHandler } from "express-async-handler";
// filename);

// const TOPIC_NAME = process.env.KAFKA_TOPIC || 'chats';
// const KAFKA_BROKERS = process.env.KAFKA_BROKER
//   ? process.env.KAFKA_BROKER.split(',')
//   : ['localhost:9092'];
// const CERT_PATH = path.join(__dirname, '../../certs');

// // Build kafkajs config
// const kafkaConfig = {
//   clientId: process.env.KAFKA_CLIENT_ID || 'my-node-app',
//   brokers: KAFKA_BROKERS
// };

// if (process.env.KAFKA_SSL === 'true') {
//   kafkaConfig.ssl = {
//     ca: [fs.readFileSync(path.join(CERT_PATH, 'ca.pem'), 'utf-8')],
//     key: fs.readFileSync(path.join(CERT_PATH, 'service.key'), 'utf-8'),
//     cert: fs.readFileSync(path.join(CERT_PATH, 'service.cert'), 'utf-8')
//   };
// }

// if (process.env.KAFKA_USERNAME && process.env.KAFKA_PASSWORD) {
//   kafkaConfig.sasl = {
//     mechanism: process.env.KAFKA_SASL_MECHANISM || 'scram-sha-256',
//     username: process.env.KAFKA_USERNAME,
//     password: process.env.KAFKA_PASSWORD
//   };
// }

// const kafka = new Kafka(kafkaConfig);

// export const producer = kafka.producer();
// export const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID || 'chats' });

// export const connectKafkaProducer = async () => {
//   try {
//     await producer.connect();
//     logger.info('Kafka Producer connected');

//     producer.on(producer.events.CONNECT, () => {
//       logger.info('KafkaJS Producer: Client connected');
//     });

//     producer.on(producer.events.DISCONNECT, () => {
//       logger.warn('KafkaJS Producer: Client disconnected');
//     });

//     producer.on(producer.events.REQUEST_TIMEOUT, ({ id, broker, client, isRetry }) => {
//       logger.error(`KafkaJS Producer: Request timeout for ${id} on broker ${broker}`);
//     });

//     // You can also add listener for producer.events.NOT_READY or producer.events.ERROR
//     // For more robust error handling, consider implementing a retry mechanism
//     // for `producer.connect()` in your application start-up.

//     return producer;
//   } catch (error) {
//     logger.error('Failed to connect Kafka Producer:', error);
//     throw error;
//   }
// };

// export const connectKafkaConsumer = async () => {
//   try {
//     await consumer.connect();
//     logger.info('Kafka Consumer connected');

//     await consumer.subscribe({ topic: TOPIC_NAME, fromBeginning: true }); // 'fromBeginning: true' is similar to 'auto.offset.reset': 'earliest'

//     await consumer.run({
//       eachMessage: async ({ topic, partition, message }) => {
//         logger.info(
//           `[Consumer] Received message from topic ${topic}, partition ${partition}: ${message.value.toString()}`
//         );
//       }
//       // You can add eachBatch if you want to process messages in batches
//       // eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStopped }) => {
//       //   for (let message of batch.messages) {
//       //     console.log({
//       //       topic: batch.topic,
//       //       partition: batch.partition,
//       //       offset: message.offset,
//       //       value: message.value.toString(),
//       //     });
//       //     resolveOffset(message.offset); // Acknowledge the message
//       //   }
//       //   await heartbeat();
//       // }
//     });

//     // Add event listeners for consumer
//     consumer.on(consumer.events.CONNECT, () => {
//       logger.info('KafkaJS Consumer: Client connected');
//     });

//     consumer.on(consumer.events.DISCONNECT, () => {
//       logger.warn('KafkaJS Consumer: Client disconnected');
//     });

//     consumer.on(consumer.events.CRASH, ({ payload }) => {
//       logger.error('KafkaJS Consumer: CRASH event detected!', payload);
//       // Implement reconnection logic or exit process based on your strategy
//     });

//     return consumer;
//   } catch (error) {
//     logger.error('Failed to connect Kafka Consumer:', error);
//     throw error;
//   }
// };

// export const disconnectKafkaClients = async () => {
//   const disconnectPromises = [];

//   if (producer) {
//     disconnectPromises.push(
//       producer
//         .disconnect()
//         .then(() => logger.info('Kafka Producer disconnected.'))
//         .catch((err) => logger.error('Error disconnecting producer:', err))
//     );
//   }

//   if (consumer) {
//     disconnectPromises.push(
//       consumer
//         .disconnect()
//         .then(() => logger.info('Kafka Consumer disconnected.'))
//         .catch((err) => logger.error('Error disconnecting consumer:', err))
//     );
//   }

//   await Promise.allSettled(disconnectPromises);
//   logger.info('All Kafka clients attempted to disconnect.');
// };
