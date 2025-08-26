import express from 'express';
import { protect } from '../middlewares/authNMiddleware.js';
import { checkout, paymentVerification } from '../helpers/razorpay.js';
import { httpResponse } from '../utils/httpResponse.js';

const router = express.Router();

router.post('/paymentverification', paymentVerification);

router.use(protect);
router.post('/checkout', checkout);
router.get('/getkey', (req, res) =>
  httpResponse(req, res, 200, 'Razorpay API key', { key: process.env.RAZORPAY_KEY_ID })
);

export default router;
