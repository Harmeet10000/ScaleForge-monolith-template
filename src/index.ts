import config from './config/dotenvConfig';
import mongoose from 'mongoose';
import app from './app';
import connectDB from './db/connectDB';
import { connectRedis, redisClient } from './db/connectRedis';
import { createConnection, closeConnection } from './db/rabbitMQConnection';
import { logger } from './utils/logger';
import process from 'process';
import type { Server } from 'http';

// --- Connect to Databases ---
// Use Promise.all to connect concurrently, or connect sequentially if preferred/needed
Promise.all([connectDB(), connectRedis(), createConnection()])
  .then(() => {
    const server: Server = app.listen(config.PORT, () => {
      logger.info(`Server is running at port: ${config.PORT}, in ${config.NODE_ENV} mode`);
    });

    // Graceful shutdown function
    const gracefulShutdown = async (signal: string): Promise<void> => {
      logger.info(`${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed.');

        // Disconnect Redis
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

        // Disconnect MongoDB
        try {
          await mongoose.disconnect();
          logger.info('MongoDB disconnected gracefully.');
        } catch (dbErr) {
          logger.error(`Error during MongoDB disconnection on ${signal}:`, { error: dbErr });
        }

        // Disconnect RabbitMQ
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

    // Handle unexpected errors
    process.on('unhandledRejection', (err) => {
      logger.error('UNHANDLED REJECTION! 💥 Shutting down...', { error: err });
      void gracefulShutdown('unhandledRejection');
    });

    // Handle SIGTERM signal
    process.on('SIGTERM', () => {
      void gracefulShutdown('SIGTERM');
    });

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      void gracefulShutdown('SIGINT');
    });
  })
  .catch((err) => {
    logger.error('Application startup failed!', { error: err });
    // Attempt to disconnect Redis, DB, and RabbitMQ even on startup failure
    void Promise.allSettled([
      redisClient.status === 'ready' || redisClient.status === 'connect'
        ? redisClient.quit()
        : Promise.resolve(),
      mongoose.connection.readyState === 1 ? mongoose.disconnect() : Promise.resolve(),
      closeConnection().catch(() => Promise.resolve())
    ]).finally(() => {
      process.exit(1);
    });
  });
