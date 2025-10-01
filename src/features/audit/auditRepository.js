import { Audit } from './auditModel.js';
import asyncHandler from 'express-async-handler';

/**
 * Create a new audit entry
 */
export const createAuditEntry = asyncHandler(async (auditData) => {
  const auditEntry = await Audit.create(auditData);
  return auditEntry;
});

/**
 * Find audit entries by entity
 */
export const findByEntity = asyncHandler(async (entityType, entityId, options = {}) => {
  const auditEntries = await Audit.findByEntity(entityType, entityId, options);
  return auditEntries;
});

/**
 * Find audit entries by user
 */
export const findByUser = asyncHandler(async (userId, options = {}) => {
  const auditEntries = await Audit.findByUser(userId, options);
  return auditEntries;
});

/**
 * Find audit entries by organization
 */
export const findByOrganization = asyncHandler(async (organizationId, options = {}) => {
  const auditEntries = await Audit.findByOrganization(organizationId, options);
  return auditEntries;
});

/**
 * Find audit entries by correlation ID
 */
export const findByCorrelationId = asyncHandler(async (correlationId) => {
  const auditEntries = await Audit.findByCorrelationId(correlationId);
  return auditEntries;
});

/**
 * Get operation statistics
 */
export const getOperationStats = asyncHandler(async (entityType, dateFrom, dateTo) => {
  const stats = await Audit.getOperationStats(entityType, dateFrom, dateTo);
  return stats;
});

/**
 * Search audit entries with pagination
 */
export const searchAuditEntries = asyncHandler(async (query, options = {}) => {
  const { page = 1, limit = 50, sortBy = 'timestamp', sortOrder = 'desc' } = options;

  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

  const [entries, total] = await Promise.all([
    Audit.find(query).populate('userId', 'email name').sort(sort).skip(skip).limit(limit),
    Audit.countDocuments(query)
  ]);

  const result = {
    entries,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };

  return result;
});

/**
 * Bulk create audit entries
 */
export const bulkCreateAuditEntries = asyncHandler(async (auditEntries) => {
  const createdEntries = await Audit.insertMany(auditEntries);
  return createdEntries;
});

/**
 * Delete expired audit entries
 */
export const deleteExpiredEntries = asyncHandler(async () => {
  const deleteResult = await Audit.deleteMany({
    expiresAt: { $lt: new Date() }
  });
  return deleteResult;
});

/**
 * Count audit entries by criteria
 */
export const countAuditEntries = asyncHandler(async (query) => {
  const count = await Audit.countDocuments(query);
  return count;
});

/**
 * Find audit entries with aggregation
 */
export const aggregateAuditEntries = asyncHandler(async (pipeline) => {
  const aggregationResult = await Audit.aggregate(pipeline);
  return aggregationResult;
});
