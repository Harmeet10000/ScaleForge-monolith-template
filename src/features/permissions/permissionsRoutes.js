import { Router } from 'express';
import {
  addUserToOrganization,
  addUserToProject,
  bulkAddUsersToOrganization,
  bulkRemoveUsersFromOrganization,
  checkAccess,
  createDocument,
  createProject,
  getDocumentUsers,
  getOrganizationUsers,
  getProjectUsers,
  getResourcePermissions,
  getUserDocuments,
  getUserOrganizations,
  getUserPermissions,
  getUserProjects,
  removeAllResourcePermissions,
  removeAllUserPermissions,
  removeUserFromOrganization,
  removeUserFromProject,
  shareDocument,
  transferOwnership,
  unshareDocument
} from './permissionsController.js';
// import {
//   authorize,
//   authorizeOrganization,
//   authorizeProject,
//   authorizeDocument,
//   requireOwnership
// } from './permissionMiddleware.js';
import { protect } from '../auth/authMiddleware.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Permissions
 *   description: OpenFGA-based permission management for organizations, projects, and documents
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     PermissionError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: "Validation error"
 *         error:
 *           type: object
 *     PermissionSuccess:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *         data:
 *           type: object
 */

// Apply authentication to all routes
router.use(protect);

// Organization routes

/**
 * @swagger
 * /permissions/organizations/{organizationId}/users:
 *   post:
 *     summary: Add user to organization
 *     description: Grant a user a specific role within an organization using OpenFGA
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *         example: "org_123456789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - role
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID to add to organization
 *                 example: "user_987654321"
 *               role:
 *                 type: string
 *                 enum: [admin, editor, viewer]
 *                 description: Role to assign to the user
 *                 example: "editor"
 *           example:
 *             userId: "user_987654321"
 *             role: "editor"
 *     responses:
 *       201:
 *         description: User successfully added to organization
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PermissionSuccess'
 *             example:
 *               success: true
 *               message: "User added to organization successfully"
 *       400:
 *         description: Bad request - Invalid input data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PermissionError'
 *             example:
 *               success: false
 *               message: "Invalid organization ID or user ID"
 *       401:
 *         description: Unauthorized - Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PermissionError'
 *             example:
 *               success: false
 *               message: "Authentication required"
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PermissionError'
 *             example:
 *               success: false
 *               message: "Insufficient permissions to add users to this organization"
 *       422:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PermissionError'
 *             example:
 *               success: false
 *               message: "Validation error"
 *               error:
 *                 details: "Role must be one of: admin, editor, viewer"
 */
router.post(
  '/organizations/:organizationId/users',
  // authorizeOrganization('admin'),
  addUserToOrganization
);

/**
 * @swagger
 * /permissions/organizations/{organizationId}/users:
 *   delete:
 *     summary: Remove user from organization
 *     description: Remove a user's role from an organization using OpenFGA
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         example: "org_123456789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - role
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "user_987654321"
 *               role:
 *                 type: string
 *                 enum: [admin, editor, viewer]
 *                 example: "editor"
 *           example:
 *             userId: "user_987654321"
 *             role: "editor"
 *     responses:
 *       200:
 *         description: User successfully removed from organization
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PermissionSuccess'
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Not found - User or organization not found
 *       422:
 *         description: Validation error
 */
router.delete(
  '/organizations/:organizationId/users',
  // authorizeOrganization('admin'),
  removeUserFromOrganization
);

/**
 * @swagger
 * /permissions/organizations/{organizationId}/users:
 *   get:
 *     summary: Get organization users
 *     description: Retrieve all users with specific role in an organization
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         example: "org_123456789"
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, editor, viewer]
 *         example: "editor"
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                   example: "Organization users retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                             example: "user_987654321"
 *                           role:
 *                             type: string
 *                             example: "editor"
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Organization not found
 *       422:
 *         description: Validation error
 */
router.get(
  '/organizations/:organizationId/users',
  // authorizeOrganization('viewer'),
  getOrganizationUsers
);

/**
 * @swagger
 * /permissions/users/{userId}/organizations:
 *   get:
 *     summary: Get user organizations
 *     description: Retrieve all organizations where user has permissions
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         example: "user_987654321"
 *       - in: query
 *         name: permission
 *         schema:
 *           type: string
 *           enum: [admin, editor, viewer]
 *         example: "editor"
 *     responses:
 *       200:
 *         description: Organizations retrieved successfully
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
 *                   example: "User organizations retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     organizations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           organizationId:
 *                             type: string
 *                             example: "org_123456789"
 *                           role:
 *                             type: string
 *                             example: "editor"
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: User not found
 *       422:
 *         description: Validation error
 */
router.get('/users/:userId/organizations', getUserOrganizations);

/**
 * @swagger
 * /permissions/organizations/{organizationId}/users/bulk:
 *   post:
 *     summary: Bulk add users to organization
 *     description: Add multiple users to an organization with the same role
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         example: "org_123456789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *               - role
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["user_111", "user_222", "user_333"]
 *               role:
 *                 type: string
 *                 enum: [admin, editor, viewer]
 *                 example: "viewer"
 *           example:
 *             userIds: ["user_111", "user_222", "user_333"]
 *             role: "viewer"
 *     responses:
 *       201:
 *         description: Users successfully added to organization
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PermissionSuccess'
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       422:
 *         description: Validation error
 */
router.post(
  '/organizations/:organizationId/users/bulk',
  // authorizeOrganization('admin'),
  bulkAddUsersToOrganization
);

/**
 * @swagger
 * /permissions/organizations/{organizationId}/users/bulk:
 *   delete:
 *     summary: Bulk remove users from organization
 *     description: Remove multiple users from an organization
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         example: "org_123456789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userIds
 *               - role
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["user_111", "user_222"]
 *               role:
 *                 type: string
 *                 enum: [admin, editor, viewer]
 *                 example: "viewer"
 *           example:
 *             userIds: ["user_111", "user_222"]
 *             role: "viewer"
 *     responses:
 *       200:
 *         description: Users successfully removed from organization
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PermissionSuccess'
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Users or organization not found
 *       422:
 *         description: Validation error
 */
router.delete(
  '/organizations/:organizationId/users/bulk',
  // authorizeOrganization('admin'),
  bulkRemoveUsersFromOrganization
);

// Project routes

/**
 * @swagger
 * /permissions/projects:
 *   post:
 *     summary: Create project
 *     description: Create a new project and assign owner permissions
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - organizationId
 *             properties:
 *               projectId:
 *                 type: string
 *                 description: Unique project identifier
 *                 example: "proj_123456789"
 *               organizationId:
 *                 type: string
 *                 description: Parent organization ID
 *                 example: "org_123456789"
 *           example:
 *             projectId: "proj_123456789"
 *             organizationId: "org_123456789"
 *     responses:
 *       201:
 *         description: Project created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PermissionSuccess'
 *             example:
 *               success: true
 *               message: "Project created successfully"
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       409:
 *         description: Conflict - Project already exists
 *       422:
 *         description: Validation error
 */
router.post('/projects', createProject);

/**
 * @swagger
 * /permissions/projects/{projectId}/users:
 *   post:
 *     summary: Add user to project
 *     description: Grant a user a specific role within a project
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         example: "proj_123456789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - role
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "user_987654321"
 *               role:
 *                 type: string
 *                 enum: [owner, editor, viewer]
 *                 example: "editor"
 *           example:
 *             userId: "user_987654321"
 *             role: "editor"
 *     responses:
 *       201:
 *         description: User successfully added to project
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PermissionSuccess'
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Project not found
 *       422:
 *         description: Validation error
 */
router.post(
  '/projects/:projectId/users',
  // authorizeProject('editor'),
  addUserToProject
);

/**
 * @swagger
 * /permissions/projects/{projectId}/users:
 *   delete:
 *     summary: Remove user from project
 *     description: Remove a user's role from a project
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         example: "proj_123456789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - role
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "user_987654321"
 *               role:
 *                 type: string
 *                 enum: [owner, editor, viewer]
 *                 example: "editor"
 *           example:
 *             userId: "user_987654321"
 *             role: "editor"
 *     responses:
 *       200:
 *         description: User successfully removed from project
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PermissionSuccess'
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Project or user not found
 *       422:
 *         description: Validation error
 */
router.delete(
  '/projects/:projectId/users',
  // authorizeProject('editor'),
  removeUserFromProject
);

/**
 * @swagger
 * /permissions/projects/{projectId}/users:
 *   get:
 *     summary: Get project users
 *     description: Retrieve all users with specific role in a project
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         example: "proj_123456789"
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [owner, editor, viewer]
 *         example: "editor"
 *     responses:
 *       200:
 *         description: Project users retrieved successfully
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
 *                   example: "Project users retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                             example: "user_987654321"
 *                           role:
 *                             type: string
 *                             example: "editor"
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Project not found
 *       422:
 *         description: Validation error
 */
router.get(
  '/projects/:projectId/users',
  // authorizeProject('viewer'),
  getProjectUsers
);

/**
 * @swagger
 * /permissions/users/{userId}/projects:
 *   get:
 *     summary: Get user projects
 *     description: Retrieve all projects where user has permissions
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         example: "user_987654321"
 *       - in: query
 *         name: permission
 *         schema:
 *           type: string
 *           enum: [owner, editor, viewer]
 *         example: "editor"
 *     responses:
 *       200:
 *         description: User projects retrieved successfully
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
 *                   example: "User projects retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     projects:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           projectId:
 *                             type: string
 *                             example: "proj_123456789"
 *                           role:
 *                             type: string
 *                             example: "editor"
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: User not found
 *       422:
 *         description: Validation error
 */
router.get('/users/:userId/projects', getUserProjects);

// Document routes

/**
 * @swagger
 * /permissions/documents:
 *   post:
 *     summary: Create document
 *     description: Create a new document and assign owner permissions
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documentId
 *               - projectId
 *             properties:
 *               documentId:
 *                 type: string
 *                 example: "doc_123456789"
 *               projectId:
 *                 type: string
 *                 example: "proj_123456789"
 *           example:
 *             documentId: "doc_123456789"
 *             projectId: "proj_123456789"
 *     responses:
 *       201:
 *         description: Document created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PermissionSuccess'
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       409:
 *         description: Conflict - Document already exists
 *       422:
 *         description: Validation error
 */
router.post('/documents', createDocument);

/**
 * @swagger
 * /permissions/documents/{documentId}/share:
 *   post:
 *     summary: Share document
 *     description: Grant a user access to a document with specific role
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         example: "doc_123456789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [owner, editor, viewer]
 *                 example: "viewer"
 *           example:
 *             role: "viewer"
 *     responses:
 *       201:
 *         description: Document shared successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PermissionSuccess'
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Document not found
 *       422:
 *         description: Validation error
 */
router.post(
  '/documents/:documentId/share',
  // authorizeDocument('editor'),
  shareDocument
);

/**
 * @swagger
 * /permissions/documents/{documentId}/share:
 *   delete:
 *     summary: Unshare document
 *     description: Remove user access from a document
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         example: "doc_123456789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [owner, editor, viewer]
 *                 example: "viewer"
 *           example:
 *             role: "viewer"
 *     responses:
 *       200:
 *         description: Document unshared successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PermissionSuccess'
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Document not found
 *       422:
 *         description: Validation error
 */
router.delete(
  '/documents/:documentId/share',
  // authorizeDocument('editor'),
  unshareDocument
);

/**
 * @swagger
 * /permissions/documents/{documentId}/users:
 *   get:
 *     summary: Get document users
 *     description: Retrieve all users with access to a document
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *         example: "doc_123456789"
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [owner, editor, viewer]
 *         example: "viewer"
 *     responses:
 *       200:
 *         description: Document users retrieved successfully
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
 *                   example: "Document users retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                             example: "user_987654321"
 *                           role:
 *                             type: string
 *                             example: "viewer"
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Document not found
 *       422:
 *         description: Validation error
 */
router.get(
  '/documents/:documentId/users',
  // authorizeDocument('viewer'),
  getDocumentUsers
);

/**
 * @swagger
 * /permissions/users/{userId}/documents:
 *   get:
 *     summary: Get user documents
 *     description: Retrieve all documents where user has permissions
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         example: "user_987654321"
 *       - in: query
 *         name: permission
 *         schema:
 *           type: string
 *           enum: [owner, editor, viewer]
 *         example: "viewer"
 *     responses:
 *       200:
 *         description: User documents retrieved successfully
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
 *                   example: "User documents retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     documents:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           documentId:
 *                             type: string
 *                             example: "doc_123456789"
 *                           role:
 *                             type: string
 *                             example: "viewer"
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: User not found
 *       422:
 *         description: Validation error
 */
router.get('/users/:userId/documents', getUserDocuments);

// Transfer ownership routes

/**
 * @swagger
 * /permissions/organizations/{resourceId}/transfer-ownership:
 *   post:
 *     summary: Transfer organization ownership
 *     description: Transfer ownership of an organization to another user
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *         example: "org_123456789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - toUserId
 *               - resourceType
 *             properties:
 *               toUserId:
 *                 type: string
 *                 example: "user_987654321"
 *               resourceType:
 *                 type: string
 *                 enum: [organization]
 *                 example: "organization"
 *           example:
 *             toUserId: "user_987654321"
 *             resourceType: "organization"
 *     responses:
 *       200:
 *         description: Ownership transferred successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PermissionSuccess'
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Must be owner to transfer ownership
 *       404:
 *         description: Organization or user not found
 *       422:
 *         description: Validation error
 */
router.post(
  '/organizations/:resourceId/transfer-ownership',
  // requireOwnership('organization'),
  transferOwnership
);

/**
 * @swagger
 * /permissions/projects/{resourceId}/transfer-ownership:
 *   post:
 *     summary: Transfer project ownership
 *     description: Transfer ownership of a project to another user
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *         example: "proj_123456789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - toUserId
 *               - resourceType
 *             properties:
 *               toUserId:
 *                 type: string
 *                 example: "user_987654321"
 *               resourceType:
 *                 type: string
 *                 enum: [project]
 *                 example: "project"
 *           example:
 *             toUserId: "user_987654321"
 *             resourceType: "project"
 *     responses:
 *       200:
 *         description: Ownership transferred successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PermissionSuccess'
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Must be owner to transfer ownership
 *       404:
 *         description: Project or user not found
 *       422:
 *         description: Validation error
 */
router.post(
  '/projects/:resourceId/transfer-ownership',
  // requireOwnership('project'),
  transferOwnership
);

/**
 * @swagger
 * /permissions/documents/{resourceId}/transfer-ownership:
 *   post:
 *     summary: Transfer document ownership
 *     description: Transfer ownership of a document to another user
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *         example: "doc_123456789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - toUserId
 *               - resourceType
 *             properties:
 *               toUserId:
 *                 type: string
 *                 example: "user_987654321"
 *               resourceType:
 *                 type: string
 *                 enum: [document]
 *                 example: "document"
 *           example:
 *             toUserId: "user_987654321"
 *             resourceType: "document"
 *     responses:
 *       200:
 *         description: Ownership transferred successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PermissionSuccess'
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Must be owner to transfer ownership
 *       404:
 *         description: Document or user not found
 *       422:
 *         description: Validation error
 */
router.post(
  '/documents/:resourceId/transfer-ownership',
  // requireOwnership('document'),
  transferOwnership
);

// Advanced query routes

/**
 * @swagger
 * /permissions/users/{userId}/permissions:
 *   get:
 *     summary: Get user permissions
 *     description: Retrieve all permissions for a specific user across all resources
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         example: "user_987654321"
 *     responses:
 *       200:
 *         description: User permissions retrieved successfully
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
 *                   example: "User permissions retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     organizations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           resourceId:
 *                             type: string
 *                             example: "org_123456789"
 *                           role:
 *                             type: string
 *                             example: "admin"
 *                     projects:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           resourceId:
 *                             type: string
 *                             example: "proj_123456789"
 *                           role:
 *                             type: string
 *                             example: "editor"
 *                     documents:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           resourceId:
 *                             type: string
 *                             example: "doc_123456789"
 *                           role:
 *                             type: string
 *                             example: "viewer"
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: User not found
 *       422:
 *         description: Validation error
 */
router.get('/users/:userId/permissions', getUserPermissions);

/**
 * @swagger
 * /permissions/resources/{resourceType}/{resourceId}/permissions:
 *   get:
 *     summary: Get resource permissions
 *     description: Retrieve all permissions for a specific resource
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [organization, project, document]
 *         example: "project"
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *         example: "proj_123456789"
 *     responses:
 *       200:
 *         description: Resource permissions retrieved successfully
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
 *                   example: "Resource permissions retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     permissions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           userId:
 *                             type: string
 *                             example: "user_987654321"
 *                           role:
 *                             type: string
 *                             example: "editor"
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Resource not found
 *       422:
 *         description: Validation error
 */
router.get(
  '/resources/:resourceType/:resourceId/permissions',
  // authorize('organization', 'viewer'), // Generic authorization
  getResourcePermissions
);

// Access check route

/**
 * @swagger
 * /permissions/check-access:
 *   post:
 *     summary: Check user access
 *     description: Check if a user has specific permission on a resource using OpenFGA
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - relation
 *               - resourceId
 *               - resourceType
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID to check access for
 *                 example: "user_987654321"
 *               relation:
 *                 type: string
 *                 enum: [owner, admin, editor, viewer]
 *                 description: Permission relation to check
 *                 example: "editor"
 *               resourceId:
 *                 type: string
 *                 description: Resource ID to check access on
 *                 example: "proj_123456789"
 *               resourceType:
 *                 type: string
 *                 enum: [organization, project, document]
 *                 description: Type of resource
 *                 example: "project"
 *           example:
 *             userId: "user_987654321"
 *             relation: "editor"
 *             resourceId: "proj_123456789"
 *             resourceType: "project"
 *     responses:
 *       200:
 *         description: Access check completed successfully
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
 *                   example: "Access check completed successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     hasAccess:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Authentication required
 *       422:
 *         description: Validation error
 */
router.post('/check-access', checkAccess);

// Cleanup routes (admin only)

/**
 * @swagger
 * /permissions/users/{userId}/permissions:
 *   delete:
 *     summary: Remove all user permissions
 *     description: Remove all permissions for a specific user (admin only)
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         example: "user_987654321"
 *     responses:
 *       200:
 *         description: All user permissions removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PermissionSuccess'
 *       400:
 *         description: Bad request - Invalid user ID
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: User not found
 *       422:
 *         description: Validation error
 */
router.delete('/users/:userId/permissions', removeAllUserPermissions);

/**
 * @swagger
 * /permissions/resources/{resourceType}/{resourceId}/permissions:
 *   delete:
 *     summary: Remove all resource permissions
 *     description: Remove all permissions for a specific resource (admin only)
 *     tags: [Permissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: resourceType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [organization, project, document]
 *         example: "project"
 *       - in: path
 *         name: resourceId
 *         required: true
 *         schema:
 *           type: string
 *         example: "proj_123456789"
 *     responses:
 *       200:
 *         description: All resource permissions removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PermissionSuccess'
 *       400:
 *         description: Bad request - Invalid resource type or ID
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Resource not found
 *       422:
 *         description: Validation error
 */
router.delete('/resources/:resourceType/:resourceId/permissions', removeAllResourcePermissions);

export default router;
