import express from 'express';
import {
  cancelSubscription,
  createSubscription,
  getCustomerSubscriptions,
  getSubscription,
  getSubscriptionsDueForRenewal,
  getSubscriptionStatistics,
  processRenewals,
  renewSubscription,
  updateSubscription
} from './subscriptionController.js';
import { protect } from '../auth/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Subscription management
 */

router.use(protect);
/**
 * @swagger
 * /subscriptions:
 *   post:
 *     summary: Create a new subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - planId
 *               - planName
 *               - billingCycle
 *               - amount
 *             properties:
 *               customerId:
 *                 type: string
 *                 description: Customer ID
 *               planId:
 *                 type: string
 *                 description: Plan identifier
 *               planName:
 *                 type: string
 *                 description: Plan name
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, quarterly, annual]
 *                 description: Billing cycle
 *               amount:
 *                 type: number
 *                 minimum: 0
 *                 description: Subscription amount
 *               currency:
 *                 type: string
 *                 enum: [INR, USD, EUR, GBP]
 *                 default: INR
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Subscription start date
 *               trialDays:
 *                 type: number
 *                 minimum: 0
 *                 description: Trial period in days
 *               metadata:
 *                 type: object
 *                 description: Additional metadata
 *     responses:
 *       201:
 *         description: Subscription created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription:
 *                       $ref: '#/components/schemas/Subscription'
 *                     isIdempotent:
 *                       type: boolean
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/', createSubscription);

/**
 * @swagger
 * /subscriptions/{subscriptionId}:
 *   get:
 *     summary: Get subscription by ID
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription ID
 *     responses:
 *       200:
 *         description: Subscription retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription:
 *                       $ref: '#/components/schemas/Subscription'
 *       404:
 *         description: Subscription not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/:subscriptionId', getSubscription);

/**
 * @swagger
 * /subscriptions/{subscriptionId}:
 *   put:
 *     summary: Update subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               planId:
 *                 type: string
 *                 description: New plan ID
 *               planName:
 *                 type: string
 *                 description: New plan name
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, quarterly, annual]
 *                 description: New billing cycle
 *               amount:
 *                 type: number
 *                 minimum: 0
 *                 description: New amount
 *               status:
 *                 type: string
 *                 enum: [active, cancelled, suspended]
 *                 description: New status
 *               metadata:
 *                 type: object
 *                 description: Additional metadata
 *     responses:
 *       200:
 *         description: Subscription updated successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Subscription not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.put('/:subscriptionId', updateSubscription);

/**
 * @swagger
 * /subscriptions/{subscriptionId}/cancel:
 *   post:
 *     summary: Cancel subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Cancellation reason
 *               immediate:
 *                 type: boolean
 *                 default: false
 *                 description: Cancel immediately or at period end
 *               refundProrated:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to refund prorated amount
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully
 *       404:
 *         description: Subscription not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/:subscriptionId/cancel', cancelSubscription);

/**
 * @swagger
 * /subscriptions/{subscriptionId}/renew:
 *   post:
 *     summary: Renew subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [manual, automatic]
 *                 default: manual
 *                 description: Renewal type
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: Custom start date for renewal
 *     responses:
 *       200:
 *         description: Subscription renewed successfully
 *       400:
 *         description: Cannot renew subscription
 *       404:
 *         description: Subscription not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/:subscriptionId/renew', renewSubscription);

/**
 * @swagger
 * /subscriptions/customer/{customerId}:
 *   get:
 *     summary: Get customer subscriptions
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, cancelled, expired, suspended, pending]
 *         description: Filter by status
 *       - in: query
 *         name: planId
 *         schema:
 *           type: string
 *         description: Filter by plan ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of results to return
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort criteria (JSON string)
 *     responses:
 *       200:
 *         description: Customer subscriptions retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/customer/:customerId', getCustomerSubscriptions);

/**
 * @swagger
 * /subscriptions/due-for-renewal:
 *   get:
 *     summary: Get subscriptions due for renewal
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: bufferHours
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 24
 *         description: Hours before due date to include
 *     responses:
 *       200:
 *         description: Subscriptions due for renewal retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/due-for-renewal', getSubscriptionsDueForRenewal);

/**
 * @swagger
 * /subscriptions/statistics:
 *   get:
 *     summary: Get subscription statistics
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for statistics
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for statistics
 *       - in: query
 *         name: planId
 *         schema:
 *           type: string
 *         description: Filter by plan ID
 *     responses:
 *       200:
 *         description: Subscription statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/statistics', getSubscriptionStatistics);

/**
 * @swagger
 * /subscriptions/process-renewals:
 *   post:
 *     summary: Process subscription renewals (batch operation)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bufferHours:
 *                 type: integer
 *                 minimum: 1
 *                 default: 24
 *                 description: Hours before due date to include
 *               dryRun:
 *                 type: boolean
 *                 default: false
 *                 description: Perform dry run without actual renewals
 *     responses:
 *       200:
 *         description: Renewals processed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.post('/process-renewals', processRenewals);

export default router;
