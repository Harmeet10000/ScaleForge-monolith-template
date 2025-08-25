import { consumer, producer } from '../db/connectKafka.js';
// import asyncHandler from 'express-async-handler';
import { logger } from '../utils/logger.js';

export const produceMessage = async (topic, message) => {
  new Promise((resolve, reject) => {
    try {
      if (!producer.isConnected()) {
        reject(new Error('Producer not connected'));
        return;
      }

      producer.produce(
        topic,
        null,
        Buffer.from(JSON.stringify(message)),
        null,
        Date.now(),
        (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        }
      );
    } catch (err) {
      reject(err);
    }
  });
};

// Event Handlers
producer.on('event.error', (err) => {
  logger.error('Producer error:', err);
});

// export const subscribeToTopics = asyncHandler(async (consumer, topics) => {
//   consumer.subscribe(topics);
//   logger.info(`Subscribed to topics: ${topics.join(', ')}`);
// });

// export const startConsuming = asyncHandler(async (consumer, messageHandler) => {
//   consumer.consume();

//   consumer.on('data', async (data) => {
//     await messageHandler({
//       topic: data.topic,
//       partition: data.partition,
//       offset: data.offset,
//       value: data.value.toString(),
//       timestamp: data.timestamp
//     });

//     consumer.commit(data);
//   });
// });

export const consumeMessages = async (topic) => {
  // Consumer is already configured as a ReadStream in kafka.config.ts
  consumer.on('data', async (message) => {
    try {
      const data = JSON.parse(message.value.toString());
      logger.info({
        topic,
        timestamp: message.timestamp,
        partition: message.partition,
        offset: message.offset,
        value: data
      });

      // await prisma.chats.create({
      //   data
      // });
    } catch (error) {
      logger.error('Error processing message:', error);
    }
  });

  consumer.on('data', (message) => {
    logger.info('Received message:', message.value.toString());
  });

  // Error handling
  consumer.on('error', (error) => {
    logger.error('Consumer error:', error);
  });
};
