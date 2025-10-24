import './config/dotenvConfig.js';
import app from './app.js';
import mongoose from 'mongoose';
import { connectDB, disconnectMongo } from './connections/connectDB.js';
import { connectPostgres, disconnectPostgres } from './connections/connectPostgres.js';
import { runMigrations } from './db/migrate.js';
// import { connectRedis, disconnectRedis, redisClient } from './connections/connectRedis.js';
// import {
//   createConnection,
//   closeConnection,
//   disconnectRabbitMQ
// } from './connections/connectRabbitMQ.js';
// import { connectKafkaProducer, consumer, producer } from './connections/connectKafka.js';
// import { connectElasticsearch, disconnectElasticsearch} from './connections/connectElasticSearch.js';
import { logger } from './utils/logger.js';

Promise.all([connectDB(), connectPostgres()])
  .then(async () => {
    // Run PostgreSQL migrations after connection
    try {
      await runMigrations();
      logger.info('Database migrations completed');
    } catch (error) {
      logger.error('Migration failed, but continuing startup:', {
        meta: { error: error.message }
      });
    }
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

        await Promise.all([
          // disconnectRedis(),
          disconnectMongo(),
          disconnectPostgres()
          // disconnectRabbitMQ()
          // disconnectElasticsearch()
          // disconnectKafka()
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
    logger.error('Application startup failed!', { meta: { error: err } });
    // Attempt to disconnect Redis, DB, PostgreSQL, RabbitMQ, and Kafka even on startup failure
    Promise.allSettled([
      // redisClient.status === 'ready' || redisClient.status === 'connect'
      //   ? redisClient.quit()
      //   : Promise.resolve(),
      mongoose.connection.readyState === 1 ? mongoose.disconnect() : Promise.resolve(),
      disconnectPostgres().catch(() => Promise.resolve())
      // closeConnection().catch(() => Promise.resolve())
      // disconnectElasticsearch().catch(() => Promise.resolve()),
      // disconnectKafka().catch(() => Promise.resolve())
    ]).finally(() => {
      process.exit(1);
    });
  });
