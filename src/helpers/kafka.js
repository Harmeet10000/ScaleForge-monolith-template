import { consumer, producer } from '../db/connectKafka.js';
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

  // Error handling
  consumer.on('error', (error) => {
    logger.error('Consumer error:', error);
  });
};
