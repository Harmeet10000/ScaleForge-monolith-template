import './config/dotenvConfig.js';
import app from './app.js';
import mongoose from 'mongoose';
import connectDB from './db/connectDB.js';
import { logger } from './utils/logger.js';
import { connectRedis, redisClient } from './db/connectRedis.js';
import { createConnection, closeConnection } from './db/rabbitMQConnection.js';

Promise.all([connectDB(), connectRedis(), createConnection()])
  .then(() => {
    const server = app.listen(process.env.PORT, () => {
      logger.info(
        `Server is running at port: ${process.env.PORT}, in ${process.env.NODE_ENV} mode`
      );
    });

    // Graceful shutdown function
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed.');

        if (redisClient.status === 'ready' || redisClient.status === 'connect') {
          try {
            await redisClient.quit();
            logger.info('Redis client disconnected gracefully.');
          } catch (redisErr) {
            logger.error(`Error during Redis disconnection on ${signal}:`, { error: redisErr });
          }
        } else {
          logger.warn('Redis client not connected or already disconnected.');
        }

        try {
          await mongoose.disconnect();
          logger.info('MongoDB disconnected gracefully.');
        } catch (dbErr) {
          logger.error(`Error during MongoDB disconnection on ${signal}:`, { error: dbErr });
        }

        try {
          await closeConnection();
          logger.info('RabbitMQ disconnected gracefully.');
        } catch (rabbitmqErr) {
          logger.error(`Error during RabbitMQ disconnection on ${signal}:`, { error: rabbitmqErr });
        }

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
    // Attempt to disconnect Redis, DB, and RabbitMQ even on startup failure
    Promise.allSettled([
      redisClient.status === 'ready' || redisClient.status === 'connect'
        ? redisClient.quit()
        : Promise.resolve(),
      mongoose.connection.readyState === 1 ? mongoose.disconnect() : Promise.resolve(),
      closeConnection().catch(() => Promise.resolve())
    ]).finally(() => {
      process.exit(1);
    });
  });
