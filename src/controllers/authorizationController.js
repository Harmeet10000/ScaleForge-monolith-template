import * as policyManager from '../services/policyManager.js';
import { httpResponse } from '../utils/httpResponse.js';
import { httpError } from '../utils/httpError.js';
import { catchAsync } from '../utils/catchAsync.js';

// Organization permissions
export const addUserToOrganization = catchAsync(async (req, res) => {
  const { organizationId } = req.params;
  const { userId, role = 'member' } = req.body;

  await policyManager.addUserToOrganization(userId, organizationId, role);

  httpResponse(req, res, 201, 'User added to organization successfully');
});

export const removeUserFromOrganization = catchAsync(async (req, res) => {
  const { organizationId } = req.params;
  const { userId, role = 'member' } = req.body;

  await policyManager.removeUserFromOrganization(userId, organizationId, role);

  httpResponse(req, res, 200, 'User removed from organization successfully');
});

export const getOrganizationUsers = catchAsync(async (req, res) => {
  const { organizationId } = req.params;
  const { role = 'member' } = req.query;

  const users = await policyManager.getOrganizationUsers(organizationId, role);

  httpResponse(req, res, 200, 'Organization users retrieved successfully', { users });
});

export const getUserOrganizations = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { permission = 'viewer' } = req.query;

  const organizations = await policyManager.getUserOrganizations(userId, permission);

  httpResponse(req, res, 200, 'User organizations retrieved successfully', { organizations });
});

// Project permissions
export const createProject = catchAsync(async (req, res) => {
  const { projectId, organizationId } = req.body;
  const userId = req.user.id;

  await policyManager.createProject(userId, projectId, organizationId);

  httpResponse(req, res, 201, 'Project created with permissions successfully');
});

export const addUserToProject = catchAsync(async (req, res) => {
  const { projectId } = req.params;
  const { userId, role = 'viewer' } = req.body;

  await policyManager.addUserToProject(userId, projectId, role);

  httpResponse(req, res, 201, 'User added to project successfully');
});

export const removeUserFromProject = catchAsync(async (req, res) => {
  const { projectId } = req.params;
  const { userId, role = 'viewer' } = req.body;

  await policyManager.removeUserFromProject(userId, projectId, role);

  httpResponse(req, res, 200, 'User removed from project successfully');
});

export const getProjectUsers = catchAsync(async (req, res) => {
  const { projectId } = req.params;
  const { role = 'viewer' } = req.query;

  const users = await policyManager.getProjectUsers(projectId, role);

  httpResponse(req, res, 200, 'Project users retrieved successfully', { users });
});

export const getUserProjects = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { permission = 'viewer' } = req.query;

  const projects = await policyManager.getUserProjects(userId, permission);

  httpResponse(req, res, 200, 'User projects retrieved successfully', { projects });
});

// Document permissions
export const createDocument = catchAsync(async (req, res) => {
  const { documentId, projectId } = req.body;
  const userId = req.user.id;

  await policyManager.createDocument(userId, documentId, projectId);

  httpResponse(req, res, 201, 'Document created with permissions successfully');
});

export const shareDocument = catchAsync(async (req, res) => {
  const { documentId } = req.params;
  const { userId, role = 'viewer' } = req.body;

  await policyManager.shareDocument(userId, documentId, role);

  httpResponse(req, res, 201, 'Document shared successfully');
});

export const unshareDocument = catchAsync(async (req, res) => {
  const { documentId } = req.params;
  const { userId, role = 'viewer' } = req.body;

  await policyManager.unshareDocument(userId, documentId, role);

  httpResponse(req, res, 200, 'Document unshared successfully');
});

export const getDocumentUsers = catchAsync(async (req, res) => {
  const { documentId } = req.params;
  const { role = 'viewer' } = req.query;

  const users = await policyManager.getDocumentUsers(documentId, role);

  httpResponse(req, res, 200, 'Document users retrieved successfully', { users });
});

export const getUserDocuments = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { permission = 'viewer' } = req.query;

  const documents = await policyManager.getUserDocuments(userId, permission);

  httpResponse(req, res, 200, 'User documents retrieved successfully', { documents });
});

// Bulk operations
export const bulkAddUsersToOrganization = catchAsync(async (req, res) => {
  const { organizationId } = req.params;
  const { userIds, role = 'member' } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw httpError(400, 'userIds must be a non-empty array');
  }

  await policyManager.bulkAddUsersToOrganization(userIds, organizationId, role);

  httpResponse(req, res, 201, `${userIds.length} users added to organization successfully`);
});

export const bulkRemoveUsersFromOrganization = catchAsync(async (req, res) => {
  const { organizationId } = req.params;
  const { userIds, role = 'member' } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw httpError(400, 'userIds must be a non-empty array');
  }

  await policyManager.bulkRemoveUsersFromOrganization(userIds, organizationId, role);

  httpResponse(req, res, 200, `${userIds.length} users removed from organization successfully`);
});

// Transfer ownership
export const transferOwnership = catchAsync(async (req, res) => {
  const { resourceId, resourceType } = req.params;
  const { toUserId } = req.body;
  const fromUserId = req.user.id;

  await policyManager.transferOwnership(fromUserId, toUserId, resourceId, resourceType);

  httpResponse(req, res, 200, 'Ownership transferred successfully');
});

// Advanced queries
export const getUserPermissions = catchAsync(async (req, res) => {
  const { userId } = req.params;

  const permissions = await policyManager.getUserPermissions(userId);

  httpResponse(req, res, 200, 'User permissions retrieved successfully', permissions);
});

export const getResourcePermissions = catchAsync(async (req, res) => {
  const { resourceId, resourceType } = req.params;

  const permissions = await policyManager.getResourcePermissions(resourceId, resourceType);

  httpResponse(req, res, 200, 'Resource permissions retrieved successfully', permissions);
});

// Check access
export const checkAccess = catchAsync(async (req, res) => {
  const { userId, resourceId, resourceType, permission = 'viewer' } = req.body;

  const hasAccess = await policyManager.fga.check(userId, permission, resourceId, resourceType);

  httpResponse(req, res, 200, 'Access check completed', { hasAccess });
});

// Cleanup operations
export const removeAllUserPermissions = catchAsync(async (req, res) => {
  const { userId } = req.params;

  await policyManager.removeAllUserPermissions(userId);

  httpResponse(req, res, 200, 'All user permissions removed successfully');
});

export const removeAllResourcePermissions = catchAsync(async (req, res) => {
  const { resourceId, resourceType } = req.params;

  await policyManager.removeAllResourcePermissions(resourceId, resourceType);

  httpResponse(req, res, 200, 'All resource permissions removed successfully');
});
