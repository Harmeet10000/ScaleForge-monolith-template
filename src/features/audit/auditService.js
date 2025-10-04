import * as auditRepository from './auditRepository.js';
import { logger } from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import asyncHandler from 'express-async-handler';

export const createAuditEntry = asyncHandler(async (auditData) => {
  const auditEntryData = {
    ...auditData,
    requestId: auditData.requestId || uuidv4(),
    correlationId: auditData.correlationId || uuidv4(),
    timestamp: new Date(),
    metadata: auditData.metadata || {},
    retentionPolicy: auditData.retentionPolicy || 'standard'
  };

  const savedAudit = await auditRepository.createAuditEntry(auditEntryData);

  logger.info(`Audit entry created: ${savedAudit._id}`, {
    meta: {
      auditId: savedAudit._id,
      entityType: auditData.entityType,
      entityId: auditData.entityId,
      operationType: auditData.operationType,
      status: auditData.status
    }
  });

  return savedAudit;
});

export const auditEntityChange = asyncHandler(async (params) => {
  const {
    entityType,
    entityId,
    operation,
    operationType,
    beforeData,
    afterData,
    operationData,
    context
  } = params;

  const changes = {
    before: beforeData,
    after: afterData,
    operationData
  };

  return createAuditEntry({
    entityType,
    entityId,
    operation,
    operationType,
    changes,
    status: 'success',
    ...context
  });
});

export const auditFailure = asyncHandler(async (params) => {
  const { entityType, entityId, operation, operationType, error, context } = params;

  return createAuditEntry({
    entityType,
    entityId,
    operation,
    operationType,
    status: 'failure',
    errorMessage: error.message,
    errorCode: error.code,
    ...context
  });
});

export const getEntityAuditTrail = asyncHandler(
  async (entityType, entityId, options = {}) =>
    await auditRepository.findByEntity(entityType, entityId, options)
);

export const getUserAuditTrail = asyncHandler(
  async (userId, options = {}) => await auditRepository.findByUser(userId, options)
);

export const getOrganizationAuditTrail = asyncHandler(
  async (organizationId, options = {}) =>
    await auditRepository.findByOrganization(organizationId, options)
);

export const getAuditByCorrelationId = asyncHandler(
  async (correlationId) => await auditRepository.findByCorrelationId(correlationId)
);

export const getOperationStats = asyncHandler(
  async (entityType, dateFrom, dateTo) =>
    await auditRepository.getOperationStats(entityType, dateFrom, dateTo)
);

export const searchAuditEntries = asyncHandler(async (searchParams) => {
  const {
    entityType,
    entityId,
    userId,
    organizationId,
    operationType,
    status,
    dateFrom,
    dateTo,
    searchText,
    page = 1,
    limit = 50,
    sortBy = 'timestamp',
    sortOrder = 'desc'
  } = searchParams;

  const baseQuery = {};

  if (entityType) {
    baseQuery.entityType = entityType;
  }
  if (entityId) {
    baseQuery.entityId = entityId;
  }
  if (userId) {
    baseQuery.userId = userId;
  }
  if (organizationId) {
    baseQuery.organizationId = organizationId;
  }
  if (operationType) {
    baseQuery.operationType = operationType;
  }
  if (status) {
    baseQuery.status = status;
  }

  if (dateFrom || dateTo) {
    baseQuery.timestamp = {};
    if (dateFrom) {
      baseQuery.timestamp.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      baseQuery.timestamp.$lte = new Date(dateTo);
    }
  }

  if (searchText) {
    baseQuery.$text = { $search: searchText };
  }

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    sortBy,
    sortOrder
  };

  const result = await auditRepository.searchAuditEntries(baseQuery, options);

  return result;
});

export const bulkCreateAuditEntries = asyncHandler(async (auditEntries) => {
  const entries = auditEntries.map((entry) => ({
    ...entry,
    requestId: entry.requestId || uuidv4(),
    correlationId: entry.correlationId || uuidv4(),
    timestamp: new Date()
  }));

  const savedEntries = await auditRepository.bulkCreateAuditEntries(entries);

  logger.info(`Bulk audit entries created: ${savedEntries.length}`, {
    meta: { count: savedEntries.length }
  });

  return savedEntries;
});

export const cleanupExpiredEntries = asyncHandler(async () => {
  const result = await auditRepository.deleteExpiredEntries();

  logger.info(`Expired audit entries cleaned up: ${result.deletedCount}`, {
    meta: { deletedCount: result.deletedCount }
  });

  return result;
});
