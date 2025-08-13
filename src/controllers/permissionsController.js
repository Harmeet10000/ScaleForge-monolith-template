import * as policyManager from '../services/permissionService.js';
import { httpResponse } from '../utils/httpResponse.js';
import { httpError } from '../utils/httpError.js';
import { catchAsync } from '../utils/catchAsync.js';
import {
  addUserToOrganizationValidation,
  addUserToProjectValidation,
  bulkAddUsersToOrganizationValidation,
  bulkRemoveUsersFromOrganizationValidation,
  checkAccessValidation,
  createDocumentValidation,
  createProjectValidation,
  getDocumentUsersValidation,
  getOrganizationUsersValidation,
  getProjectUsersValidation,
  getResourcePermissionsValidation,
  getUserDocumentsValidation,
  getUserOrganizationsValidation,
  getUserPermissionsValidation,
  getUserProjectsValidation,
  removeAllResourcePermissionsValidation,
  removeAllUserPermissionsValidation,
  removeUserFromOrganizationValidation,
  removeUserFromProjectValidation,
  shareDocumentValidation,
  transferOwnershipValidation,
  unshareDocumentValidation,
  validateJoiSchema
} from '../validations/authRValidation.js';

// Organization permissions
export const addUserToOrganization = catchAsync(async (req, res, next) => {
  const data = { ...req.body, ...req.params };
  const { error, value } = validateJoiSchema(addUserToOrganizationValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { userId, organizationId, role } = value;
  // console.log(`Adding user ${userId} to organization ${organizationId} with role ${role}`);

  await policyManager.addUserToOrganization(userId, organizationId, role);

  httpResponse(req, res, 201, 'User added to organization successfully');
});

export const removeUserFromOrganization = catchAsync(async (req, res, next) => {
  const data = { ...req.body, ...req.params };
  const { error, value } = validateJoiSchema(removeUserFromOrganizationValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { userId, organizationId, role } = value;

  await policyManager.removeUserFromOrganization(userId, organizationId, role);

  httpResponse(req, res, 200, 'User removed from organization successfully');
});

export const getOrganizationUsers = catchAsync(async (req, res, next) => {
  const data = { ...req.params, ...req.query };
  const { error, value } = validateJoiSchema(getOrganizationUsersValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { organizationId, role } = value;

  const users = await policyManager.getOrganizationUsers(organizationId, role);

  httpResponse(req, res, 200, 'Organization users retrieved successfully', { users });
});

export const getUserOrganizations = catchAsync(async (req, res, next) => {
  const data = { ...req.params, ...req.query };
  const { error, value } = validateJoiSchema(getUserOrganizationsValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { userId, permission } = value;

  const organizations = await policyManager.getUserOrganizations(userId, permission);

  httpResponse(req, res, 200, 'User organizations retrieved successfully', { organizations });
});

// Project permissions
export const createProject = catchAsync(async (req, res, next) => {
  const { error, value } = validateJoiSchema(createProjectValidation, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { projectId, organizationId } = value;
  const userId = req.user.id;

  await policyManager.createProject(userId, projectId, organizationId);

  httpResponse(req, res, 201, 'Project created with permissions successfully');
});

export const addUserToProject = catchAsync(async (req, res, next) => {
  const data = { ...req.body, ...req.params };
  const { error, value } = validateJoiSchema(addUserToProjectValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { userId, projectId, role } = value;

  await policyManager.addUserToProject(userId, projectId, role);

  httpResponse(req, res, 201, 'User added to project successfully');
});

export const removeUserFromProject = catchAsync(async (req, res, next) => {
  const data = { ...req.body, ...req.params };
  const { error, value } = validateJoiSchema(removeUserFromProjectValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { userId, projectId, role } = value;

  await policyManager.removeUserFromProject(userId, projectId, role);

  httpResponse(req, res, 200, 'User removed from project successfully');
});

export const getProjectUsers = catchAsync(async (req, res, next) => {
  const data = { ...req.params, ...req.query };
  const { error, value } = validateJoiSchema(getProjectUsersValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { projectId, role } = value;

  const users = await policyManager.getProjectUsers(projectId, role);

  httpResponse(req, res, 200, 'Project users retrieved successfully', { users });
});

export const getUserProjects = catchAsync(async (req, res, next) => {
  const data = { ...req.params, ...req.query };
  const { error, value } = validateJoiSchema(getUserProjectsValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { userId, permission } = value;

  const projects = await policyManager.getUserProjects(userId, permission);

  httpResponse(req, res, 200, 'User projects retrieved successfully', { projects });
});

// Document permissions
export const createDocument = catchAsync(async (req, res, next) => {
  const { error, value } = validateJoiSchema(createDocumentValidation, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { documentId, projectId } = value;
  const userId = req.user.id;

  await policyManager.createDocument(userId, documentId, projectId);

  httpResponse(req, res, 201, 'Document created with permissions successfully');
});

export const shareDocument = catchAsync(async (req, res, next) => {
  const data = { ...req.body, ...req.params };
  const { error, value } = validateJoiSchema(shareDocumentValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { userId, documentId, role } = value;

  await policyManager.shareDocument(userId, documentId, role);

  httpResponse(req, res, 201, 'Document shared successfully');
});

export const unshareDocument = catchAsync(async (req, res, next) => {
  const data = { ...req.body, ...req.params };
  const { error, value } = validateJoiSchema(unshareDocumentValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { userId, documentId, role } = value;

  await policyManager.unshareDocument(userId, documentId, role);

  httpResponse(req, res, 200, 'Document unshared successfully');
});

export const getDocumentUsers = catchAsync(async (req, res, next) => {
  const data = { ...req.params, ...req.query };
  const { error, value } = validateJoiSchema(getDocumentUsersValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { documentId, role } = value;

  const users = await policyManager.getDocumentUsers(documentId, role);

  httpResponse(req, res, 200, 'Document users retrieved successfully', { users });
});

export const getUserDocuments = catchAsync(async (req, res, next) => {
  const data = { ...req.params, ...req.query };
  const { error, value } = validateJoiSchema(getUserDocumentsValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { userId, permission } = value;

  const documents = await policyManager.getUserDocuments(userId, permission);

  httpResponse(req, res, 200, 'User documents retrieved successfully', { documents });
});

// Bulk operations
export const bulkAddUsersToOrganization = catchAsync(async (req, res, next) => {
  const data = { ...req.body, ...req.params };
  const { error, value } = validateJoiSchema(bulkAddUsersToOrganizationValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { userIds, organizationId, role } = value;

  await policyManager.bulkAddUsersToOrganization(userIds, organizationId, role);

  httpResponse(req, res, 201, `${userIds.length} users added to organization successfully`);
});

export const bulkRemoveUsersFromOrganization = catchAsync(async (req, res, next) => {
  const data = { ...req.body, ...req.params };
  const { error, value } = validateJoiSchema(bulkRemoveUsersFromOrganizationValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { userIds, organizationId, role } = value;

  await policyManager.bulkRemoveUsersFromOrganization(userIds, organizationId, role);

  httpResponse(req, res, 200, `${userIds.length} users removed from organization successfully`);
});

// Transfer ownership
export const transferOwnership = catchAsync(async (req, res, next) => {
  const data = { ...req.body, ...req.params };
  const { error } = validateJoiSchema(transferOwnershipValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { resourceId, resourceType } = req.params;
  const { toUserId } = req.body;
  const fromUserId = req.user.id;

  await policyManager.transferOwnership(fromUserId, toUserId, resourceId, resourceType);

  httpResponse(req, res, 200, 'Ownership transferred successfully');
});

// Advanced queries
export const getUserPermissions = catchAsync(async (req, res, next) => {
  const { error } = validateJoiSchema(getUserPermissionsValidation, req.params);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { userId } = req.params;

  const permissions = await policyManager.getUserPermissions(userId);

  httpResponse(req, res, 200, 'User permissions retrieved successfully', permissions);
});

export const getResourcePermissions = catchAsync(async (req, res, next) => {
  const { error } = validateJoiSchema(getResourcePermissionsValidation, req.params);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { resourceId, resourceType } = req.params;

  const permissions = await policyManager.getResourcePermissions(resourceId, resourceType);

  httpResponse(req, res, 200, 'Resource permissions retrieved successfully', permissions);
});

// Check access
export const checkAccess = catchAsync(async (req, res, next) => {
  const { error } = validateJoiSchema(checkAccessValidation, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const { userId, resourceId, resourceType, permission } = req.body;

  const hasAccess = await policyManager.fga.check(userId, permission, resourceId, resourceType);

  httpResponse(req, res, 200, 'Access check completed', { hasAccess });
});

// Cleanup operations
export const removeAllUserPermissions = catchAsync(async (req, res, next) => {
  const { error } = validateJoiSchema(removeAllUserPermissionsValidation, req.params);
  if (error) {
    return httpError(next, error, req, 422);
  }

  // const { userId } = req.params;

  await policyManager.removeAllUserPermissions(req.params.userId);

  httpResponse(req, res, 200, 'All user permissions removed successfully');
});

export const removeAllResourcePermissions = catchAsync(async (req, res, next) => {
  const { error } = validateJoiSchema(removeAllResourcePermissionsValidation, req.params);
  if (error) {
    return httpError(next, error, req, 422);
  }

  // const { resourceId, resourceType } = req.params;

  await policyManager.removeAllResourcePermissions(req.params.resourceId, req.params.resourceType);

  httpResponse(req, res, 200, 'All resource permissions removed successfully');
});
