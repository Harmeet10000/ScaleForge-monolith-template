import express, { Router } from 'express';
import { health, self } from '../controllers/healthController.js';

const router: Router = express.Router();

router.get('/self', self);
router.get('/health', health);

export default router;
