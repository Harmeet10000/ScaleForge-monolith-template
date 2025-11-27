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

// Mask sensitive personal information in audit entries
// Masks: email addresses, phone numbers, credit card numbers, SSN, IP addresses
const maskSensitiveData = (value) => {
  if (!value || typeof value !== 'string') {
    return value;
  }

  // Email: user***@domain.com
  if (value.includes('@')) {
    const [localPart, domain] = value.split('@');
    const maskedLocal =
      localPart.charAt(0) +
      '*'.repeat(Math.max(3, localPart.length - 1)) +
      (localPart.length > 1 ? localPart.charAt(localPart.length - 1) : '');
    return `${maskedLocal}@${domain}`;
  }

  // Phone: (***) ***-5678 for typical US format, or ***-5678 for other formats
  if (/^\+?1?\d{7,}$/.test(value.replace(/\D/g, ''))) {
    const digits = value.replace(/\D/g, '');
    if (digits.length >= 10) {
      return `***-***-${digits.slice(-4)}`;
    }
    return `***-${digits.slice(-4)}`;
  }

  // Credit card: ****1234
  if (/^\d{13,19}$/.test(value.replace(/\s/g, ''))) {
    const digits = value.replace(/\D/g, '');
    if (digits.length >= 4) {
      return `****${digits.slice(-4)}`;
    }
  }

  // SSN: ***-**-1234
  if (/^\d{3}-\d{2}-\d{4}$/.test(value) || /^\d{9}$/.test(value.replace(/\D/g, ''))) {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 9) {
      return `***-**-${digits.slice(-4)}`;
    }
  }

  // IP address: 192.168.*.* or similar
  if (/^\d+\.\d+\.\d+\.\d+$/.test(value)) {
    const parts = value.split('.');
    return `${parts[0]}.${parts[1]}.*.${parts[3]}`;
  }

  return value;
};

// Recursively mask sensitive data in objects
const maskSensitiveDataInObject = (
  obj,
  keysToMask = [
    'email',
    'phone',
    'phoneNumber',
    'cardNumber',
    'creditCard',
    'ssn',
    'password',
    'token',
    'apiKey',
    'ipAddress',
    'ip',
    'pan',
    'cvv',
    'accountNumber',
    'routingNumber',
    'bankAccount',
    'mobileNumber'
  ]
) => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => maskSensitiveDataInObject(item, keysToMask));
  }

  const masked = {};
  for (const [key, value] of Object.entries(obj)) {
    if (keysToMask.some((maskKey) => key.toLowerCase().includes(maskKey.toLowerCase()))) {
      masked[key] = maskSensitiveData(value);
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveDataInObject(value, keysToMask);
    } else {
      masked[key] = value;
    }
  }

  return masked;
};

// Get complete audit trail by correlation ID with PII masking
export const getAuditTrailByCorrelationId = asyncHandler(async (correlationId, options = {}) => {
  if (!correlationId) {
    throw new Error('Correlation ID is required');
  }

  const filters = {
    correlationId
  };

  if (options.entityType) {
    filters.entityType = options.entityType;
  }

  if (options.operationType) {
    filters.operationType = options.operationType;
  }

  if (options.userId) {
    filters.userId = options.userId;
  }

  if (options.dateRange) {
    filters.timestamp = {};
    if (options.dateRange.start) {
      filters.timestamp.$gte = new Date(options.dateRange.start);
    }
    if (options.dateRange.end) {
      filters.timestamp.$lte = new Date(options.dateRange.end);
    }
  }

  const entries = await auditRepository.findByCorrelationId(correlationId, {
    filters,
    sortBy: 'timestamp',
    sortOrder: 'asc'
  });

  // Mask sensitive data in all entries
  const maskedEntries = entries.map((entry) => {
    const entryObj = entry.toObject ? entry.toObject() : entry;

    return {
      ...entryObj,
      metadata: maskSensitiveDataInObject(entryObj.metadata),
      changes: entryObj.changes ? maskSensitiveDataInObject(entryObj.changes) : undefined,
      errorMessage: maskSensitiveData(entryObj.errorMessage)
    };
  });

  logger.info(`Audit trail retrieved for correlation ID: ${correlationId}`, {
    meta: {
      correlationId,
      totalEntries: maskedEntries.length,
      dateRange: options.dateRange
    }
  });

  return {
    correlationId,
    totalEntries: maskedEntries.length,
    entries: maskedEntries,
    retrievedAt: new Date()
  };
});

export default {
  createAuditEntry,
  auditEntityChange,
  auditFailure,
  getEntityAuditTrail,
  getUserAuditTrail,
  getOrganizationAuditTrail,
  getAuditByCorrelationId,
  getAuditTrailByCorrelationId,
  getOperationStats,
  searchAuditEntries,
  bulkCreateAuditEntries,
  cleanupExpiredEntries
};
