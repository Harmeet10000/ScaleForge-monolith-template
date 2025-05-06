import express, { Router } from 'express';
import {
  sendMessage,
  startConsumer,
  runTaskQueue,
  getStatus
} from '../controllers/rabbitmqController.js';

const router: Router = express.Router();

// Swagger documentation comments remain unchanged
router.post('/send', sendMessage);
router.post('/consume', startConsumer);
router.post('/task-queue', runTaskQueue);
router.get('/status', getStatus);

export default router;
