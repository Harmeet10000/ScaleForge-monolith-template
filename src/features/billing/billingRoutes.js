import express from 'express';
import * as billingController from './billingController.js';
import { protect } from '../auth/authMiddleware.js';
import {
  validateBillingProfile,
  validateInvoiceGeneration,
  validatePaymentMethod
} from './billingValidation.js';

const router = express.Router();

router.use(protect);

// Invoice Management Routes
router.post(
  '/invoices/generate/:subscriptionId',
  validateInvoiceGeneration,
  billingController.generateInvoice
);

router.post('/invoices/proration/:subscriptionId', billingController.generateProrationInvoice);

router.post('/billing/recurring', billingController.processRecurringBilling);

router.get('/invoices/customer/:customerId', billingController.getCustomerInvoices);

router.get('/invoices/overdue', billingController.getOverdueInvoices);

router.post('/invoices/:invoiceId/reminder', billingController.sendInvoiceReminder);

// Billing Profile Management Routes
router.post(
  '/profiles/:customerId',
  validateBillingProfile,
  billingController.createBillingProfile
);

router.get('/profiles/:customerId', billingController.getBillingProfile);

router.put('/profiles/:customerId', validateBillingProfile, billingController.updateBillingProfile);

// Payment Method Management Routes
router.post(
  '/profiles/:customerId/payment-methods',
  validatePaymentMethod,
  billingController.addPaymentMethod
);

router.delete(
  '/profiles/:customerId/payment-methods/:methodId',
  billingController.removePaymentMethod
);

router.put(
  '/profiles/:customerId/payment-methods/:methodId/default',
  billingController.setDefaultPaymentMethod
);

// Payment Failure Handling Routes
router.post('/payments/:subscriptionId/:paymentId/failure', billingController.handlePaymentFailure);

// Statistics and Reporting Routes
router.get('/statistics', billingController.getBillingStatistics);

export default router;
