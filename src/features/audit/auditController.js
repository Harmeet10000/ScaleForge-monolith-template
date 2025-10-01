import * as auditService from './auditService.js';
import { httpResponse } from '../../utils/httpResponse.js';
import { httpError } from '../../utils/httpError.js';
import {
  validateGetEntityAuditTrail,
  validateGetUserAuditTrail,
  validateGetOrganizationAuditTrail,
  validateGetAuditByCorrelationId,
  validateSearchAuditEntries,
  validateGetOperationStats,
  validateGetAuditDashboard,
  validateCreateAuditEntry
} from './auditValidation.js';
import { validateJoiSchema } from '../../helpers/generalHelper.js';
import asyncHandler from 'express-async-handler';

/**
 * Get audit trail for an entity
 */
export const getEntityAuditTrail = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateGetEntityAuditTrail, {
    ...req.params,
    ...req.query
  });
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { entityType, entityId, ...options } = value;
  const auditTrail = await auditService.getEntityAuditTrail(entityType, entityId, options);

  return httpResponse(req, res, 200, 'Entity audit trail retrieved successfully', auditTrail);
});

/**
 * Get audit trail for a user
 */
export const getUserAuditTrail = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateGetUserAuditTrail, {
    ...req.params,
    ...req.query
  });
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { userId, ...options } = value;
  const auditTrail = await auditService.getUserAuditTrail(userId, options);

  return httpResponse(req, res, 200, 'User audit trail retrieved successfully', auditTrail);
});

/**
 * Get audit trail for an organization
 */
export const getOrganizationAuditTrail = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateGetOrganizationAuditTrail, {
    ...req.params,
    ...req.query
  });
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { organizationId, ...options } = value;
  const auditTrail = await auditService.getOrganizationAuditTrail(organizationId, options);

  return httpResponse(req, res, 200, 'Organization audit trail retrieved successfully', auditTrail);
});

/**
 * Get audit entries by correlation ID
 */
export const getAuditByCorrelationId = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateGetAuditByCorrelationId, req.params);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { correlationId } = value;
  const auditEntries = await auditService.getAuditByCorrelationId(correlationId);

  return httpResponse(req, res, 200, 'Audit entries retrieved successfully', auditEntries);
});

/**
 * Search audit entries
 */
export const searchAuditEntries = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateSearchAuditEntries, req.query);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await auditService.searchAuditEntries(value);

  return httpResponse(req, res, 200, 'Audit entries searched successfully', result);
});

/**
 * Get operation statistics
 */
export const getOperationStats = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateGetOperationStats, {
    ...req.params,
    ...req.query
  });
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { entityType, dateFrom, dateTo } = value;
  const stats = await auditService.getOperationStats(entityType, dateFrom, dateTo);

  return httpResponse(req, res, 200, 'Operation statistics retrieved successfully', stats);
});

/**
 * Create audit entry (for manual auditing)
 */
export const createAuditEntry = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateCreateAuditEntry, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const auditData = {
    ...value,
    userId: req.user?.id,
    organizationId: req.user?.organizationId,
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    requestId: req.id
  };

  const auditEntry = await auditService.createAuditEntry(auditData);

  return httpResponse(req, res, 201, 'Audit entry created successfully', auditEntry);
});

/**
 * Get audit dashboard data
 */
export const getAuditDashboard = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateGetAuditDashboard, {
    ...req.params,
    ...req.query
  });
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { organizationId, dateFrom, dateTo } = value;

  const startDate = dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const endDate = dateTo || new Date();

  // Get stats for different entity types
  const [paymentStats, subscriptionStats, userStats, recentActivity] = await Promise.all([
    auditService.getOperationStats('payment', startDate, endDate),
    auditService.getOperationStats('subscription', startDate, endDate),
    auditService.getOperationStats('user', startDate, endDate),
    auditService.getOrganizationAuditTrail(organizationId, {
      dateFrom: startDate,
      dateTo: endDate,
      limit: 20
    })
  ]);

  const dashboard = {
    dateRange: { from: startDate, to: endDate },
    statistics: {
      payments: paymentStats,
      subscriptions: subscriptionStats,
      users: userStats
    },
    recentActivity
  };

  return httpResponse(req, res, 200, 'Audit dashboard data retrieved successfully', dashboard);
});
