import { Router } from 'express';
import { protect } from '../auth/authMiddleware.js';
import {
  createAuditEntry,
  getAuditByCorrelationId,
  getAuditDashboard,
  getEntityAuditTrail,
  getOperationStats,
  getOrganizationAuditTrail,
  getUserAuditTrail,
  searchAuditEntries
} from './auditController.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Audit
 *   description: Audit trail and compliance tracking endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AuditError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Audit operation failed"
 *         error:
 *           type: object
 *     AuditSuccess:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *         data:
 *           type: object
 *     AuditEntry:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "60c7c8d4f8b6c8001f8e4b8a"
 *         entityType:
 *           type: string
 *           enum: [payment, subscription, user, plan, invoice, refund, webhook, api_key, organization, billing_address]
 *           example: "payment"
 *         entityId:
 *           type: string
 *           example: "60c7c8d4f8b6c8001f8e4b8b"
 *         operation:
 *           type: string
 *           example: "Payment created"
 *         operationType:
 *           type: string
 *           example: "payment_create"
 *         userId:
 *           type: string
 *           example: "60c7c8d4f8b6c8001f8e4b8c"
 *         organizationId:
 *           type: string
 *           example: "60c7c8d4f8b6c8001f8e4b8d"
 *         status:
 *           type: string
 *           enum: [success, failure, error, pending]
 *           example: "success"
 *         correlationId:
 *           type: string
 *           example: "audit_1640995200000_abc123def"
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: "2023-12-01T10:30:00.000Z"
 *         metadata:
 *           type: object
 *           example: { "amount": 100.00, "currency": "USD" }
 *     PaginationInfo:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 50
 *         total:
 *           type: integer
 *           example: 150
 *         pages:
 *           type: integer
 *           example: 3
 */

// Apply authentication middleware to all routes
router.use(protect);

/**
 * @swagger
 * /audit/entity/{entityType}/{entityId}:
 *   get:
 *     summary: Get audit trail for an entity
 *     description: Retrieve audit trail for a specific entity with filtering options
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [payment, subscription, user, plan, invoice, refund, webhook, api_key, organization, billing_address]
 *         example: "payment"
 *       - in: path
 *         name: entityId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         example: "60c7c8d4f8b6c8001f8e4b8a"
 *       - in: query
 *         name: operationType
 *         schema:
 *           type: string
 *         description: Filter by operation type
 *         example: "payment_create"
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Filter by user ID
 *         example: "60c7c8d4f8b6c8001f8e4b8c"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [success, failure, error, pending]
 *         description: Filter by status
 *         example: "success"
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering
 *         example: "2023-12-01T00:00:00.000Z"
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering
 *         example: "2023-12-31T23:59:59.999Z"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 50
 *         description: Number of results to return
 *         example: 50
 *       - in: query
 *         name: populate
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include user details
 *         example: true
 *     responses:
 *       200:
 *         description: Entity audit trail retrieved successfully
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
 *                   example: "Entity audit trail retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuditEntry'
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditError'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditError'
 */
router.get('/entity/:entityType/:entityId', getEntityAuditTrail);

/**
 * @swagger
 * /audit/user/{userId}:
 *   get:
 *     summary: Get audit trail for a user
 *     description: Retrieve audit trail for a specific user across all entities
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         example: "60c7c8d4f8b6c8001f8e4b8c"
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [payment, subscription, user, plan, invoice, refund, webhook, api_key, organization, billing_address]
 *         description: Filter by entity type
 *         example: "payment"
 *       - in: query
 *         name: operationType
 *         schema:
 *           type: string
 *         description: Filter by operation type
 *         example: "payment_create"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 50
 *         description: Number of results to return
 *         example: 50
 *     responses:
 *       200:
 *         description: User audit trail retrieved successfully
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
 *                   example: "User audit trail retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuditEntry'
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditError'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditError'
 */
router.get('/user/:userId', getUserAuditTrail);

/**
 * @swagger
 * /audit/organization/{organizationId}:
 *   get:
 *     summary: Get audit trail for an organization
 *     description: Retrieve audit trail for all activities within an organization
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         example: "60c7c8d4f8b6c8001f8e4b8d"
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [payment, subscription, user, plan, invoice, refund, webhook, api_key, organization, billing_address]
 *         description: Filter by entity type
 *         example: "payment"
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering
 *         example: "2023-12-01T00:00:00.000Z"
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering
 *         example: "2023-12-31T23:59:59.999Z"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *         description: Number of results to return
 *         example: 100
 *     responses:
 *       200:
 *         description: Organization audit trail retrieved successfully
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
 *                   example: "Organization audit trail retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuditEntry'
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditError'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditError'
 */
router.get('/organization/:organizationId', getOrganizationAuditTrail);

/**
 * @swagger
 * /audit/correlation/{correlationId}:
 *   get:
 *     summary: Get audit entries by correlation ID
 *     description: Retrieve all audit entries linked by a correlation ID for tracking related operations
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: correlationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Correlation ID to track related operations
 *         example: "550e8400-e29b-41d4-a716-446655440000"
 *     responses:
 *       200:
 *         description: Audit entries retrieved successfully
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
 *                   example: "Audit entries retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/AuditEntry'
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditError'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditError'
 */
router.get('/correlation/:correlationId', getAuditByCorrelationId);

/**
 * @swagger
 * /audit/search:
 *   get:
 *     summary: Search audit entries
 *     description: Advanced search across audit entries with filtering, sorting, and pagination
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *           enum: [payment, subscription, user, plan, invoice, refund, webhook, api_key, organization, billing_address]
 *         description: Filter by entity type
 *         example: "payment"
 *       - in: query
 *         name: entityId
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Filter by entity ID
 *         example: "60c7c8d4f8b6c8001f8e4b8a"
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Filter by user ID
 *         example: "60c7c8d4f8b6c8001f8e4b8c"
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         description: Filter by organization ID
 *         example: "60c7c8d4f8b6c8001f8e4b8d"
 *       - in: query
 *         name: operationType
 *         schema:
 *           type: string
 *         description: Filter by operation type
 *         example: "payment_create"
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [success, failure, error, pending]
 *         description: Filter by status
 *         example: "success"
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for filtering
 *         example: "2023-12-01T00:00:00.000Z"
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for filtering
 *         example: "2023-12-31T23:59:59.999Z"
 *       - in: query
 *         name: searchText
 *         schema:
 *           type: string
 *           minLength: 3
 *           maxLength: 100
 *         description: Text search across operations and error messages
 *         example: "payment failed"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *         description: Number of results per page
 *         example: 50
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [timestamp, entityType, operationType, status]
 *           default: timestamp
 *         description: Field to sort by
 *         example: "timestamp"
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *         example: "desc"
 *     responses:
 *       200:
 *         description: Audit entries searched successfully
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
 *                   example: "Audit entries searched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     entries:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AuditEntry'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationInfo'
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditError'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditError'
 */
router.get('/search', searchAuditEntries);

/**
 * @swagger
 * /audit/stats/{entityType}:
 *   get:
 *     summary: Get operation statistics
 *     description: Retrieve aggregated statistics for operations on a specific entity type
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: entityType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [payment, subscription, user, plan, invoice, refund, webhook, api_key, organization, billing_address]
 *         example: "payment"
 *       - in: query
 *         name: dateFrom
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for statistics
 *         example: "2023-12-01T00:00:00.000Z"
 *       - in: query
 *         name: dateTo
 *         required: true
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for statistics
 *         example: "2023-12-31T23:59:59.999Z"
 *     responses:
 *       200:
 *         description: Operation statistics retrieved successfully
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
 *                   example: "Operation statistics retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: object
 *                         properties:
 *                           operationType:
 *                             type: string
 *                             example: "payment_create"
 *                           status:
 *                             type: string
 *                             example: "success"
 *                       count:
 *                         type: integer
 *                         example: 150
 *                       avgDuration:
 *                         type: number
 *                         example: 245.5
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditError'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditError'
 */
router.get('/stats/:entityType', getOperationStats);

/**
 * @swagger
 * /audit/dashboard/{organizationId}:
 *   get:
 *     summary: Get audit dashboard data
 *     description: Retrieve comprehensive audit dashboard with statistics and recent activity for an organization
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *           pattern: '^[0-9a-fA-F]{24}$'
 *         example: "60c7c8d4f8b6c8001f8e4b8d"
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for dashboard data (defaults to 30 days ago)
 *         example: "2023-12-01T00:00:00.000Z"
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for dashboard data (defaults to now)
 *         example: "2023-12-31T23:59:59.999Z"
 *     responses:
 *       200:
 *         description: Audit dashboard data retrieved successfully
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
 *                   example: "Audit dashboard data retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     dateRange:
 *                       type: object
 *                       properties:
 *                         from:
 *                           type: string
 *                           format: date-time
 *                           example: "2023-12-01T00:00:00.000Z"
 *                         to:
 *                           type: string
 *                           format: date-time
 *                           example: "2023-12-31T23:59:59.999Z"
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         payments:
 *                           type: array
 *                           items:
 *                             type: object
 *                         subscriptions:
 *                           type: array
 *                           items:
 *                             type: object
 *                         users:
 *                           type: array
 *                           items:
 *                             type: object
 *                     recentActivity:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AuditEntry'
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditError'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditError'
 */
router.get('/dashboard/:organizationId', getAuditDashboard);

/**
 * @swagger
 * /audit:
 *   post:
 *     summary: Create audit entry
 *     description: Manually create an audit entry (for admin use or external integrations)
 *     tags: [Audit]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - entityType
 *               - entityId
 *               - operation
 *               - operationType
 *               - status
 *             properties:
 *               entityType:
 *                 type: string
 *                 enum: [payment, subscription, user, plan, invoice, refund, webhook, api_key, organization, billing_address]
 *                 example: "payment"
 *               entityId:
 *                 type: string
 *                 pattern: '^[0-9a-fA-F]{24}$'
 *                 example: "60c7c8d4f8b6c8001f8e4b8a"
 *               operation:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: "Payment processed manually"
 *               operationType:
 *                 type: string
 *                 example: "payment_create"
 *               correlationId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional correlation ID for linking related operations
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               changes:
 *                 type: object
 *                 properties:
 *                   before:
 *                     type: object
 *                     description: State before the operation
 *                   after:
 *                     type: object
 *                     description: State after the operation
 *                   operationData:
 *                     type: object
 *                     description: Additional operation data
 *               status:
 *                 type: string
 *                 enum: [success, failure, error, pending]
 *                 example: "success"
 *               errorMessage:
 *                 type: string
 *                 maxLength: 500
 *                 description: Error message if status is failure or error
 *                 example: "Payment gateway timeout"
 *               errorCode:
 *                 type: string
 *                 maxLength: 50
 *                 description: Error code if status is failure or error
 *                 example: "GATEWAY_TIMEOUT"
 *               metadata:
 *                 type: object
 *                 description: Additional metadata for the audit entry
 *                 example: { "amount": 100.00, "currency": "USD" }
 *               retentionPolicy:
 *                 type: string
 *                 enum: [standard, extended, permanent]
 *                 default: standard
 *                 description: Data retention policy for this audit entry
 *                 example: "standard"
 *               duration:
 *                 type: integer
 *                 minimum: 0
 *                 description: Operation duration in milliseconds
 *                 example: 250
 *           example:
 *             entityType: "payment"
 *             entityId: "60c7c8d4f8b6c8001f8e4b8a"
 *             operation: "Payment processed manually"
 *             operationType: "payment_create"
 *             status: "success"
 *             metadata:
 *               amount: 100.00
 *               currency: "USD"
 *               method: "manual"
 *     responses:
 *       201:
 *         description: Audit entry created successfully
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
 *                   example: "Audit entry created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/AuditEntry'
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditError'
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuditError'
 *             example:
 *               success: false
 *               message: "Validation error"
 *               error:
 *                 details: "entityType is required"
 */
router.post('/', createAuditEntry);

export default router;
