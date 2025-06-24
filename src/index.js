import './config/dotenvConfig.js';
import app from './app.js';
import mongoose from 'mongoose';
import connectDB from './db/connectDB.js';
import { connectRedis, redisClient } from './db/connectRedis.js';
import { createConnection, closeConnection } from './db/rabbitMQConnection.js';
import { connectKafkaProducer, consumer, producer } from './db/connectKafka.js';
import { logger } from './utils/logger.js';
import { catchAsync } from './utils/catchAsync.js';

Promise.all([connectDB(), connectRedis(), createConnection(), connectKafkaProducer()])
  .then(() => {
    const server = app.listen(process.env.PORT, () => {
      logger.info(
        `Server is running at port: ${process.env.PORT}, in ${process.env.NODE_ENV} mode`
      );
    });

    const disconnectRedis = catchAsync(async () => {
      if (redisClient.status === 'ready' || redisClient.status === 'connect') {
        await redisClient.quit();
        logger.info('Redis client disconnected gracefully.');
      } else {
        logger.warn('Redis client not connected or already disconnected.');
      }
    });

    const disconnectMongo = catchAsync(async () => {
      await mongoose.disconnect();
      logger.info('MongoDB disconnected gracefully.');
    });

    const disconnectRabbitMQ = catchAsync(async () => {
      await closeConnection();
      logger.info('RabbitMQ disconnected gracefully.');
    });

    const disconnectKafka = catchAsync(async () => {
      await producer.disconnect();
      logger.info('Kafka producer disconnected');
      await consumer.destroy();
      logger.info('Kafka consumer destroyed');
      // await disconnectAdmin();
      // logger.info('Kafka Admin client disconnected');
    });

    // Graceful shutdown function
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed.');

        await Promise.all([
          disconnectRedis(),
          disconnectMongo(),
          disconnectRabbitMQ(),
          disconnectKafka()
        ]);

        logger.info('Process terminated!');
        process.exit(signal === 'unhandledRejection' ? 1 : 0);
      });
    };

    process.on('unhandledRejection', (err) => {
      logger.error('UNHANDLED REJECTION! 💥 Shutting down...', { error: err });
      gracefulShutdown('unhandledRejection');
    });

    process.on('SIGTERM', () => {
      gracefulShutdown('SIGTERM');
    });

    process.on('SIGINT', () => {
      gracefulShutdown('SIGINT');
    });
  })
  .catch((err) => {
    logger.error('Application startup failed!', { error: err });
    // Attempt to disconnect Redis, DB, RabbitMQ, and Kafka even on startup failure
    Promise.allSettled([
      redisClient.status === 'ready' || redisClient.status === 'connect'
        ? redisClient.quit()
        : Promise.resolve(),
      mongoose.connection.readyState === 1 ? mongoose.disconnect() : Promise.resolve(),
      closeConnection().catch(() => Promise.resolve())
      // disconnectKafka().catch(() => Promise.resolve())
    ]).finally(() => {
      process.exit(1);
    });
  });
