import express from 'express';
import {
  checkout,
  paymentVerification,
  getPaymentHistoryController,
  getPaymentStatusController,
  processRefundController,
  retryPaymentController,
  getRazorpayKey
} from './paymentController.js';
import { protect } from '../auth/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment processing and management endpoints
 */

/**
 * @swagger
 * /payments/verification:
 *   post:
 *     summary: Verify payment signature
 *     description: Verify Razorpay payment signature after payment completion
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - razorpay_order_id
 *               - razorpay_payment_id
 *               - razorpay_signature
 *             properties:
 *               razorpay_order_id:
 *                 type: string
 *                 example: "order_ABC123"
 *               razorpay_payment_id:
 *                 type: string
 *                 example: "pay_XYZ789"
 *               razorpay_signature:
 *                 type: string
 *                 example: "signature_hash"
 *     responses:
 *       200:
 *         description: Payment verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentSuccess'
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 */
router.post('/verification', paymentVerification);

// Protected routes (authentication required)
router.use(protect);

/**
 * @swagger
 * /payments/checkout:
 *   post:
 *     summary: Create payment order
 *     description: Create a new payment order with Razorpay
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 example: 100.50
 *               currency:
 *                 type: string
 *                 enum: [INR, USD, EUR, GBP]
 *                 default: INR
 *                 example: "INR"
 *               subscriptionId:
 *                 type: string
 *                 example: "sub_123"
 *               description:
 *                 type: string
 *                 maxLength: 255
 *                 example: "Payment for premium subscription"
 *               metadata:
 *                 type: object
 *                 example: {"plan": "premium"}
 *               notes:
 *                 type: object
 *                 example: {"customer_note": "urgent"}
 *     responses:
 *       200:
 *         description: Payment order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Payment order created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentId:
 *                       type: string
 *                       example: "pay_123456"
 *                     razorpayOrderId:
 *                       type: string
 *                       example: "order_ABC123"
 *                     amount:
 *                       type: number
 *                       example: 100.50
 *                     currency:
 *                       type: string
 *                       example: "INR"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 */
router.post('/checkout', checkout);

/**
 * @swagger
 * /payments/history:
 *   get:
 *     summary: Get payment history
 *     description: Retrieve payment history for the authenticated user
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of records per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed, refunded, cancelled]
 *         description: Filter by payment status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter payments from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter payments until this date
 *       - in: query
 *         name: subscriptionId
 *         schema:
 *           type: string
 *         description: Filter by subscription ID
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, amount, status]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentSuccess'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 */
router.get('/history', getPaymentHistoryController);

/**
 * @swagger
 * /payments/status/{paymentId}:
 *   get:
 *     summary: Get payment status
 *     description: Get status and details of a specific payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID
 *         example: "pay_123456"
 *     responses:
 *       200:
 *         description: Payment status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentSuccess'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 *       403:
 *         description: Forbidden - Payment belongs to another user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 */
router.get('/status/:paymentId', getPaymentStatusController);

/**
 * @swagger
 * /payments/refund:
 *   post:
 *     summary: Process payment refund
 *     description: Process a refund for a completed payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentId
 *             properties:
 *               paymentId:
 *                 type: string
 *                 example: "pay_123456"
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 example: 50.25
 *                 description: "Refund amount (optional, defaults to full amount)"
 *               reason:
 *                 type: string
 *                 maxLength: 255
 *                 example: "Customer requested refund"
 *               notes:
 *                 type: object
 *                 example: {"refund_type": "partial"}
 *     responses:
 *       200:
 *         description: Refund processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentSuccess'
 *       400:
 *         description: Bad request - Payment cannot be refunded
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 */
router.post('/refund', processRefundController);

/**
 * @swagger
 * /payments/retry/{paymentId}:
 *   post:
 *     summary: Retry failed payment
 *     description: Retry a failed payment (if retry attempts are available)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment ID to retry
 *         example: "pay_123456"
 *     responses:
 *       200:
 *         description: Payment retry initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentSuccess'
 *       400:
 *         description: Bad request - Payment cannot be retried
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 *       403:
 *         description: Forbidden - Payment belongs to another user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 *       404:
 *         description: Payment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 */
router.post('/retry/:paymentId', retryPaymentController);

/**
 * @swagger
 * /payments/key:
 *   get:
 *     summary: Get Razorpay API key
 *     description: Get the Razorpay public API key for client-side integration
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Razorpay API key retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Razorpay API key retrieved"
 *                 data:
 *                   type: object
 *                   properties:
 *                     key:
 *                       type: string
 *                       example: "rzp_test_1234567890"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentError'
 */
router.get('/key', getRazorpayKey);

export default router;
