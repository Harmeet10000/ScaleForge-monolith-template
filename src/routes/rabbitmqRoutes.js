// filepath: /home/harmeet/Desktop/Projects/Production-grade-Auth-template/backend/src/routes/rabbitmqRoutes.js
import express from 'express';
import {
  sendMessage,
  startConsumer,
  runTaskQueue,
  getStatus
} from '../controllers/rabbitmqController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: RabbitMQ
 *   description: RabbitMQ testing endpoints
 */

/**
 * @swagger
 * /api/rabbitmq/send:
 *   post:
 *     summary: Send test messages using RabbitMQ producer
 *     tags: [RabbitMQ]
 *     responses:
 *       200:
 *         description: Messages sent successfully
 */
router.post('/send', sendMessage);

/**
 * @swagger
 * /api/rabbitmq/consume:
 *   post:
 *     summary: Start consuming messages from RabbitMQ queues
 *     tags: [RabbitMQ]
 *     responses:
 *       200:
 *         description: Consumers started successfully
 */
router.post('/consume', startConsumer);

/**
 * @swagger
 * /api/rabbitmq/task-queue:
 *   post:
 *     summary: Run a task queue example with priority support
 *     tags: [RabbitMQ]
 *     responses:
 *       200:
 *         description: Task queue example executed successfully
 */
router.post('/task-queue', runTaskQueue);

/**
 * @swagger
 * /api/rabbitmq/status:
 *   get:
 *     summary: Get status of RabbitMQ operations
 *     tags: [RabbitMQ]
 *     responses:
 *       200:
 *         description: Status retrieved successfully
 */
router.get('/status', getStatus);

export default router;
