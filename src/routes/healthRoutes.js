import express from 'express';
import { health, self } from '../controllers/healthController.js';

const router = express.Router();

router.get('/self', self);
router.get('/health', health);

export default router;
