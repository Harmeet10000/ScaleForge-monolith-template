import Razorpay from 'razorpay';
import { catchAsync } from '../utils/catchAsync.js';
import crypto from 'crypto';
import { httpError } from '../utils/httpError.js';
import { httpResponse } from '../utils/httpResponse.js';
import { SUCCESS } from '../constants/responseMessage.js';
import { logger } from '../utils/logger.js';

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

export const checkout = catchAsync(async (req, res) => {
  const options = {
    amount: Number(req.body.amount * 100),
    currency: 'INR'
  };
  const order = await instance.orders.create(options);
  logger.info('Razorpay order created', { meta: { orderId: order.id, order } });

  httpResponse(req, res, 200, SUCCESS, {
    order
  });
});

export const paymentVerification = catchAsync(async (req, res, next) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return next(new httpError('Incomplete payment details provided', 400));
  }

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest('hex');

  const isAuthentic = expectedSignature === razorpay_signature;

  if (isAuthentic) {
    // Send response
    res.redirect(`${process.env.FRONTEND_URL}/psf?payment_id=${razorpay_payment_id}`);

    // res.status(200).json({
    //   success: true,
    //   data: {
    //     razorpay_payment_id,
    //   },
    // });
  } else {
    httpError(next, new Error('Payment verification failed!'), req, 400);
  }
});
