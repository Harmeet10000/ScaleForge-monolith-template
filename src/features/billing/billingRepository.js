import { Invoice } from '../../models/invoiceModel.js';
import { BillingProfile } from './billingProfileModel.js';
import { logger } from '../../utils/logger.js';
import { httpError } from '../../utils/httpError.js';

// Invoice Repository Functions
export const createInvoice = async (invoiceData) => {
  try {
    const invoice = new Invoice(invoiceData);
    await invoice.save();

    logger.info('Invoice created in database', {
      meta: {
        invoiceId: invoice.invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        amount: invoice.total
      }
    });

    return invoice;
  } catch (error) {
    logger.error('Failed to create invoice', {
      meta: {
        error: error.message,
        stack: error.stack,
        invoiceData: { ...invoiceData, lineItems: invoiceData.lineItems?.length || 0 }
      }
    });
    throw error;
  }
};

export const findInvoiceById = async (invoiceId) => {
  try {
    const invoice = await Invoice.findById(invoiceId)
      .populate('customerId', 'name emailAddress')
      .populate('subscriptionId', 'planName billingCycle')
      .lean();

    return invoice;
  } catch (error) {
    logger.error('Failed to find invoice by ID', {
      meta: {
        invoiceId,
        error: error.message
      }
    });
    throw error;
  }
};

export const findInvoiceByNumber = async (invoiceNumber) => {
  try {
    const invoice = await Invoice.findByInvoiceNumber(invoiceNumber)
      .populate('customerId', 'name emailAddress')
      .populate('subscriptionId', 'planName billingCycle');

    return invoice;
  } catch (error) {
    logger.error('Failed to find invoice by number', {
      meta: {
        invoiceNumber,
        error: error.message
      }
    });
    throw error;
  }
};

export const findInvoicesByCustomer = async (customerId, filters = {}, pagination = {}) => {
  try {
    const { limit = 10, skip = 0, sort = { issueDate: -1 } } = pagination;

    const invoices = await Invoice.findByCustomer(customerId, {
      ...filters,
      limit,
      sort
    })
      .skip(skip)
      .populate('subscriptionId', 'planName billingCycle');

    return invoices;
  } catch (error) {
    logger.error('Failed to find invoices by customer', {
      meta: {
        customerId,
        filters,
        error: error.message
      }
    });
    throw error;
  }
};

export const findInvoicesBySubscription = async (subscriptionId, filters = {}, pagination = {}) => {
  try {
    const { limit = 10, skip = 0, sort = { issueDate: -1 } } = pagination;

    const query = { subscriptionId, ...filters };
    const invoices = await Invoice.find(query)
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .populate('customerId', 'name emailAddress')
      .populate('subscriptionId', 'planName billingCycle');

    return invoices;
  } catch (error) {
    logger.error('Failed to find invoices by subscription', {
      meta: {
        subscriptionId,
        filters,
        error: error.message
      }
    });
    throw error;
  }
};

export const updateInvoiceById = async (invoiceId, updateData) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(
      invoiceId,
      { $set: updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    logger.info('Invoice updated successfully', {
      meta: {
        invoiceId,
        updatedFields: Object.keys(updateData)
      }
    });

    return invoice;
  } catch (error) {
    logger.error('Failed to update invoice', {
      meta: {
        invoiceId,
        updateData: Object.keys(updateData),
        error: error.message
      }
    });
    throw error;
  }
};

export const markInvoiceAsPaid = async (invoiceId, paymentData) => {
  try {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    await invoice.markAsPaid(paymentData);

    logger.info('Invoice marked as paid', {
      meta: {
        invoiceId,
        amount: paymentData.amount,
        paymentId: paymentData.paymentId
      }
    });

    return invoice;
  } catch (error) {
    logger.error('Failed to mark invoice as paid', {
      meta: {
        invoiceId,
        paymentData,
        error: error.message
      }
    });
    throw error;
  }
};

export const addInvoicePayment = async (invoiceId, paymentData) => {
  try {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    await invoice.addPayment(paymentData);

    logger.info('Payment added to invoice', {
      meta: {
        invoiceId,
        paymentAmount: paymentData.amount,
        totalPaid: invoice.amountPaid
      }
    });

    return invoice;
  } catch (error) {
    logger.error('Failed to add payment to invoice', {
      meta: {
        invoiceId,
        paymentData,
        error: error.message
      }
    });
    throw error;
  }
};

export const findOverdueInvoices = async () => {
  try {
    const invoices = await Invoice.findOverdueInvoices()
      .populate('customerId', 'name emailAddress')
      .populate('subscriptionId', 'planName billingCycle');

    logger.info('Retrieved overdue invoices', {
      meta: {
        count: invoices.length
      }
    });

    return invoices;
  } catch (error) {
    logger.error('Failed to find overdue invoices', {
      meta: {
        error: error.message
      }
    });
    throw error;
  }
};

export const findInvoicesDueSoon = async (days = 7) => {
  try {
    const invoices = await Invoice.findDueSoon(days)
      .populate('customerId', 'name emailAddress')
      .populate('subscriptionId', 'planName billingCycle');

    logger.info('Retrieved invoices due soon', {
      meta: {
        count: invoices.length,
        days
      }
    });

    return invoices;
  } catch (error) {
    logger.error('Failed to find invoices due soon', {
      meta: {
        days,
        error: error.message
      }
    });
    throw error;
  }
};

export const getInvoiceStatistics = async (filters = {}) => {
  try {
    const statistics = await Invoice.getInvoiceStatistics(filters);

    logger.info('Retrieved invoice statistics', {
      meta: {
        filters,
        hasResults: statistics.length > 0
      }
    });

    return (
      statistics[0] || {
        totalInvoices: 0,
        totalAmount: 0,
        totalPaid: 0,
        totalOutstanding: 0,
        byStatus: [],
        byType: []
      }
    );
  } catch (error) {
    logger.error('Failed to get invoice statistics', {
      meta: {
        filters,
        error: error.message
      }
    });
    throw error;
  }
};

export const countInvoices = async (filters = {}) => {
  try {
    const count = await Invoice.countDocuments(filters);
    return count;
  } catch (error) {
    logger.error('Failed to count invoices', {
      meta: {
        filters,
        error: error.message
      }
    });
    throw error;
  }
};

export const addInvoiceAuditEntry = async (
  invoiceId,
  operation,
  operationType,
  userId,
  details,
  ipAddress,
  userAgent,
  status,
  errorMessage
) => {
  try {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new Error('Invoice not found');
    }

    await invoice.addAuditEntry(
      operation,
      operationType,
      userId,
      details,
      ipAddress,
      userAgent,
      status,
      errorMessage
    );

    return invoice;
  } catch (error) {
    logger.error('Failed to add invoice audit entry', {
      meta: {
        invoiceId,
        operation,
        operationType,
        error: error.message
      }
    });
    throw error;
  }
};

// Billing Profile Repository Functions
export const createBillingProfile = async (customerId, profileData) => {
  try {
    const billingProfile = await BillingProfile.createProfile(customerId, profileData);

    logger.info('Billing profile created in database', {
      meta: {
        customerId,
        billingProfileId: billingProfile._id
      }
    });

    return billingProfile;
  } catch (error) {
    logger.error('Failed to create billing profile', {
      meta: {
        customerId,
        error: error.message,
        stack: error.stack
      }
    });
    throw error;
  }
};

export const findBillingProfileByCustomer = async (customerId) => {
  try {
    const billingProfile = await BillingProfile.findByCustomer(customerId);
    return billingProfile;
  } catch (error) {
    logger.error('Failed to find billing profile by customer', {
      meta: {
        customerId,
        error: error.message
      }
    });
    throw error;
  }
};

export const updateBillingProfile = async (customerId, updateData) => {
  try {
    const billingProfile = await BillingProfile.findOneAndUpdate(
      { customerId },
      { $set: updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!billingProfile) {
      throw new Error('Billing profile not found');
    }

    logger.info('Billing profile updated successfully', {
      meta: {
        customerId,
        updatedFields: Object.keys(updateData)
      }
    });

    return billingProfile;
  } catch (error) {
    logger.error('Failed to update billing profile', {
      meta: {
        customerId,
        updateData: Object.keys(updateData),
        error: error.message
      }
    });
    throw error;
  }
};

export const addPaymentMethodToProfile = async (customerId, paymentMethodData) => {
  try {
    const billingProfile = await BillingProfile.findByCustomer(customerId);
    if (!billingProfile) {
      throw new Error('Billing profile not found');
    }

    await billingProfile.addPaymentMethod(paymentMethodData);

    logger.info('Payment method added to billing profile', {
      meta: {
        customerId,
        methodId: paymentMethodData.methodId,
        methodType: paymentMethodData.type
      }
    });

    return billingProfile;
  } catch (error) {
    logger.error('Failed to add payment method to profile', {
      meta: {
        customerId,
        paymentMethodData,
        error: error.message
      }
    });
    throw error;
  }
};

export const removePaymentMethodFromProfile = async (customerId, methodId) => {
  try {
    const billingProfile = await BillingProfile.findByCustomer(customerId);
    if (!billingProfile) {
      throw new Error('Billing profile not found');
    }

    await billingProfile.removePaymentMethod(methodId);

    logger.info('Payment method removed from billing profile', {
      meta: {
        customerId,
        methodId
      }
    });

    return billingProfile;
  } catch (error) {
    logger.error('Failed to remove payment method from profile', {
      meta: {
        customerId,
        methodId,
        error: error.message
      }
    });
    throw error;
  }
};

export const setDefaultPaymentMethodInProfile = async (customerId, methodId) => {
  try {
    const billingProfile = await BillingProfile.findByCustomer(customerId);
    if (!billingProfile) {
      throw new Error('Billing profile not found');
    }

    await billingProfile.setDefaultPaymentMethod(methodId);

    logger.info('Default payment method updated in billing profile', {
      meta: {
        customerId,
        methodId
      }
    });

    return billingProfile;
  } catch (error) {
    logger.error('Failed to set default payment method in profile', {
      meta: {
        customerId,
        methodId,
        error: error.message
      }
    });
    throw error;
  }
};

export const updateCreditBalance = async (customerId, amount, operation = 'add') => {
  try {
    const billingProfile = await BillingProfile.findByCustomer(customerId);
    if (!billingProfile) {
      throw new Error('Billing profile not found');
    }

    if (operation === 'add') {
      await billingProfile.addCredit(amount);
    } else if (operation === 'deduct') {
      await billingProfile.deductCredit(amount);
    } else {
      throw new Error('Invalid credit operation. Use "add" or "deduct"');
    }

    logger.info('Credit balance updated in billing profile', {
      meta: {
        customerId,
        amount,
        operation,
        newBalance: billingProfile.creditBalance
      }
    });

    return billingProfile;
  } catch (error) {
    logger.error('Failed to update credit balance', {
      meta: {
        customerId,
        amount,
        operation,
        error: error.message
      }
    });
    throw error;
  }
};

export const recordPaymentInProfile = async (customerId, amount) => {
  try {
    const billingProfile = await BillingProfile.findByCustomer(customerId);
    if (!billingProfile) {
      throw new Error('Billing profile not found');
    }

    await billingProfile.recordPayment(amount);

    logger.info('Payment recorded in billing profile', {
      meta: {
        customerId,
        amount,
        totalSpent: billingProfile.totalSpent
      }
    });

    return billingProfile;
  } catch (error) {
    logger.error('Failed to record payment in profile', {
      meta: {
        customerId,
        amount,
        error: error.message
      }
    });
    throw error;
  }
};

export const findProfilesWithExpiredMethods = async () => {
  try {
    const profiles = await BillingProfile.findProfilesWithExpiredMethods();

    logger.info('Retrieved profiles with expired payment methods', {
      meta: {
        count: profiles.length
      }
    });

    return profiles;
  } catch (error) {
    logger.error('Failed to find profiles with expired methods', {
      meta: {
        error: error.message
      }
    });
    throw error;
  }
};

export const addBillingProfileAuditEntry = async (
  customerId,
  operation,
  operationType,
  userId,
  details,
  ipAddress,
  userAgent,
  status,
  errorMessage
) => {
  try {
    const billingProfile = await BillingProfile.findByCustomer(customerId);
    if (!billingProfile) {
      throw new Error('Billing profile not found');
    }

    await billingProfile.addAuditEntry(
      operation,
      operationType,
      userId,
      details,
      ipAddress,
      userAgent,
      status,
      errorMessage
    );

    return billingProfile;
  } catch (error) {
    logger.error('Failed to add billing profile audit entry', {
      meta: {
        customerId,
        operation,
        operationType,
        error: error.message
      }
    });
    throw error;
  }
};
