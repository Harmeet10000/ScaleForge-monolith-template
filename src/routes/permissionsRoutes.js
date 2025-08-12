import { Router } from 'express';
import { addUserToOrganization, addUserToProject, bulkAddUsersToOrganization, bulkRemoveUsersFromOrganization, checkAccess, createDocument, createProject, getDocumentUsers, getOrganizationUsers, getProjectUsers, getResourcePermissions, getUserDocuments, getUserOrganizations, getUserPermissions, getUserProjects, removeAllResourcePermissions, removeAllUserPermissions, removeUserFromOrganization, removeUserFromProject, shareDocument, transferOwnership, unshareDocument } from '../controllers/permissionsController.js';
import {
  authorize,
  authorizeOrganization,
  authorizeProject,
  authorizeDocument,
  requireOwnership
} from '../middlewares/authRMiddleware.js';
// import { protect } from '../middlewares/authNMiddleware.js';

const router = Router();

// Apply authentication to all routes
// router.use(protect);

// Organization routes
router.post(
  '/organizations/:organizationId/users',
  // authorizeOrganization('admin'),
  addUserToOrganization
);

router.delete(
  '/organizations/:organizationId/users',
  // authorizeOrganization('admin'),
  removeUserFromOrganization
);

router.get(
  '/organizations/:organizationId/users',
  // authorizeOrganization('viewer'),
  getOrganizationUsers
);

router.get('/users/:userId/organizations', getUserOrganizations);

router.post(
  '/organizations/:organizationId/users/bulk',
  // authorizeOrganization('admin'),
  bulkAddUsersToOrganization
);

router.delete(
  '/organizations/:organizationId/users/bulk',
  // authorizeOrganization('admin'),
  bulkRemoveUsersFromOrganization
);

// Project routes
router.post('/projects', createProject);

router.post(
  '/projects/:projectId/users',
  // authorizeProject('editor'),
  addUserToProject
);

router.delete(
  '/projects/:projectId/users',
  // authorizeProject('editor'),
  removeUserFromProject
);

router.get(
  '/projects/:projectId/users',
  // authorizeProject('viewer'),
  getProjectUsers
);

router.get('/users/:userId/projects', getUserProjects);

// Document routes
router.post('/documents', createDocument);

router.post(
  '/documents/:documentId/share',
  // authorizeDocument('editor'),
  shareDocument
);

router.delete(
  '/documents/:documentId/share',
  // authorizeDocument('editor'),
  unshareDocument
);

router.get(
  '/documents/:documentId/users',
  // authorizeDocument('viewer'),
  getDocumentUsers
);

router.get('/users/:userId/documents', getUserDocuments);

// Transfer ownership routes
router.post(
  '/organizations/:resourceId/transfer-ownership',
  // requireOwnership('organization'),
  transferOwnership
);

router.post(
  '/projects/:resourceId/transfer-ownership',
  // requireOwnership('project'),
  transferOwnership
);

router.post(
  '/documents/:resourceId/transfer-ownership',
  // requireOwnership('document'),
  transferOwnership
);

// Advanced query routes
router.get('/users/:userId/permissions', getUserPermissions);

router.get(
  '/resources/:resourceType/:resourceId/permissions',
  // authorize('organization', 'viewer'), // Generic authorization
  getResourcePermissions
);

// Access check route
router.post('/check-access', checkAccess);

// Cleanup routes (admin only)
router.delete('/users/:userId/permissions', removeAllUserPermissions);

router.delete(
  '/resources/:resourceType/:resourceId/permissions',
  removeAllResourcePermissions
);

export default router;
