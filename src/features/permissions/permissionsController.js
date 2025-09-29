import * as permissionService from './permissionService.js';
import { httpResponse } from '../../utils/httpResponse.js';
import { httpError } from '../../utils/httpError.js';
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
  unshareDocumentValidation
} from './permissionValidation.js';
import { validateJoiSchema } from '../../helpers/generalHelper.js';
import {
  ACCESS_CHECK_COMPLETED,
  ALL_RESOURCE_PERMISSIONS_REMOVED,
  ALL_USER_PERMISSIONS_REMOVED,
  DOCUMENT_CREATED,
  DOCUMENT_SHARED,
  DOCUMENT_UNSHARED,
  DOCUMENT_USERS_RETRIEVED,
  ORGANIZATION_USERS_RETRIEVED,
  OWNERSHIP_TRANSFERRED,
  PROJECT_CREATED,
  PROJECT_USERS_RETRIEVED,
  RESOURCE_PERMISSIONS_RETRIEVED,
  USER_ADDED_TO_ORGANIZATION,
  USER_ADDED_TO_PROJECT,
  USER_DOCUMENTS_RETRIEVED,
  USER_ORGANIZATIONS_RETRIEVED,
  USER_PERMISSIONS_RETRIEVED,
  USER_PROJECTS_RETRIEVED,
  USER_REMOVED_FROM_ORGANIZATION,
  USER_REMOVED_FROM_PROJECT,
  USERS_ADDED_TO_ORGANIZATION,
  USERS_REMOVED_FROM_ORGANIZATION
} from './permissionConstants.js';
import asyncHandler from 'express-async-handler';

// Organization permissions
export const addUserToOrganization = asyncHandler(async (req, res, next) => {
  const data = { ...req.body, ...req.params };
  const { error, value } = validateJoiSchema(addUserToOrganizationValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  await permissionService.addUserToOrganization(value.userId, value.organizationId, value.role);

  httpResponse(req, res, 201, USER_ADDED_TO_ORGANIZATION);
});

export const removeUserFromOrganization = asyncHandler(async (req, res, next) => {
  const data = { ...req.body, ...req.params };
  const { error, value } = validateJoiSchema(removeUserFromOrganizationValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  await permissionService.removeUserFromOrganization(
    value.userId,
    value.organizationId,
    value.role
  );

  httpResponse(req, res, 200, USER_REMOVED_FROM_ORGANIZATION);
});

export const getOrganizationUsers = asyncHandler(async (req, res, next) => {
  const data = { ...req.params, ...req.query };
  const { error, value } = validateJoiSchema(getOrganizationUsersValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const users = await permissionService.getOrganizationUsers(value.organizationId, value.role);

  httpResponse(req, res, 200, ORGANIZATION_USERS_RETRIEVED, { users });
});

export const getUserOrganizations = asyncHandler(async (req, res, next) => {
  const data = { ...req.params, ...req.query };
  const { error, value } = validateJoiSchema(getUserOrganizationsValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const organizations = await permissionService.getUserOrganizations(
    value.userId,
    value.permission
  );

  httpResponse(req, res, 200, USER_ORGANIZATIONS_RETRIEVED, { organizations });
});

// Project permissions
export const createProject = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(createProjectValidation, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  await permissionService.createProject(req.user.id, value.projectId, value.organizationId);

  httpResponse(req, res, 201, PROJECT_CREATED);
});

export const addUserToProject = asyncHandler(async (req, res, next) => {
  const data = { ...req.body, ...req.params };
  const { error, value } = validateJoiSchema(addUserToProjectValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  await permissionService.addUserToProject(value.userId, value.projectId, value.role);

  httpResponse(req, res, 201, USER_ADDED_TO_PROJECT);
});

export const removeUserFromProject = asyncHandler(async (req, res, next) => {
  const data = { ...req.body, ...req.params };
  const { error, value } = validateJoiSchema(removeUserFromProjectValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  await permissionService.removeUserFromProject(value.userId, value.projectId, value.role);

  httpResponse(req, res, 200, USER_REMOVED_FROM_PROJECT);
});

export const getProjectUsers = asyncHandler(async (req, res, next) => {
  const data = { ...req.params, ...req.query };
  const { error, value } = validateJoiSchema(getProjectUsersValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const users = await permissionService.getProjectUsers(value.projectId, value.role);

  httpResponse(req, res, 200, PROJECT_USERS_RETRIEVED, { users });
});

export const getUserProjects = asyncHandler(async (req, res, next) => {
  const data = { ...req.params, ...req.query };
  const { error, value } = validateJoiSchema(getUserProjectsValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const projects = await permissionService.getUserProjects(value.userId, value.permission);

  httpResponse(req, res, 200, USER_PROJECTS_RETRIEVED, { projects });
});

// Document permissions
export const createDocument = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(createDocumentValidation, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  await permissionService.createDocument(req.user.id, value.documentId, value.projectId);

  httpResponse(req, res, 201, DOCUMENT_CREATED);
});

export const shareDocument = asyncHandler(async (req, res, next) => {
  const data = { ...req.body, ...req.params };
  const { error, value } = validateJoiSchema(shareDocumentValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  await permissionService.shareDocument(req.user.id, value.documentId, value.role);

  httpResponse(req, res, 201, DOCUMENT_SHARED);
});

export const unshareDocument = asyncHandler(async (req, res, next) => {
  const data = { ...req.body, ...req.params };
  const { error, value } = validateJoiSchema(unshareDocumentValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  await permissionService.unshareDocument(req.user.id, value.documentId, value.role);

  httpResponse(req, res, 200, DOCUMENT_UNSHARED);
});

export const getDocumentUsers = asyncHandler(async (req, res, next) => {
  const data = { ...req.params, ...req.query };
  const { error, value } = validateJoiSchema(getDocumentUsersValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const users = await permissionService.getDocumentUsers(value.documentId, value.role);

  httpResponse(req, res, 200, DOCUMENT_USERS_RETRIEVED, { users });
});

export const getUserDocuments = asyncHandler(async (req, res, next) => {
  const data = { ...req.params, ...req.query };
  const { error, value } = validateJoiSchema(getUserDocumentsValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const documents = await permissionService.getUserDocuments(value.userId, value.permission);

  httpResponse(req, res, 200, USER_DOCUMENTS_RETRIEVED, { documents });
});

// Bulk operations
export const bulkAddUsersToOrganization = asyncHandler(async (req, res, next) => {
  const data = { ...req.body, ...req.params };
  const { error, value } = validateJoiSchema(bulkAddUsersToOrganizationValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  await permissionService.bulkAddUsersToOrganization(
    value.userIds,
    value.organizationId,
    value.role
  );

  httpResponse(req, res, 201, `${value.userIds.length} ${USERS_ADDED_TO_ORGANIZATION}`);
});

export const bulkRemoveUsersFromOrganization = asyncHandler(async (req, res, next) => {
  const data = { ...req.body, ...req.params };
  const { error, value } = validateJoiSchema(bulkRemoveUsersFromOrganizationValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  await permissionService.bulkRemoveUsersFromOrganization(
    value.userIds,
    value.organizationId,
    value.role
  );
  httpResponse(req, res, 200, `${value.userIds.length} ${USERS_REMOVED_FROM_ORGANIZATION}`);
});

// Transfer ownership
export const transferOwnership = asyncHandler(async (req, res, next) => {
  const data = { ...req.body, ...req.params };
  const { error, value } = validateJoiSchema(transferOwnershipValidation, data);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const fromUserId = req.user.id;

  await permissionService.transferOwnership(
    fromUserId,
    value.toUserId,
    value.resourceId,
    value.resourceType
  );

  httpResponse(req, res, 200, OWNERSHIP_TRANSFERRED);
});

// Advanced queries
export const getUserPermissions = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(getUserPermissionsValidation, req.params);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const permissions = await permissionService.getUserPermissions(value.userId);

  httpResponse(req, res, 200, USER_PERMISSIONS_RETRIEVED, permissions);
});

export const getResourcePermissions = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(getResourcePermissionsValidation, req.params);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const permissions = await permissionService.getResourcePermissions(
    value.resourceId,
    value.resourceType
  );

  httpResponse(req, res, 200, RESOURCE_PERMISSIONS_RETRIEVED, permissions);
});

// Check access
export const checkAccess = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(checkAccessValidation, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const hasAccess = await permissionService.check(
    value.userId,
    value.relation,
    value.resourceId,
    value.resourceType
  );

  httpResponse(req, res, 200, ACCESS_CHECK_COMPLETED, { hasAccess });
});

// Cleanup operations
export const removeAllUserPermissions = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(removeAllUserPermissionsValidation, req.params);
  if (error) {
    return httpError(next, error, req, 422);
  }

  await permissionService.removeAllUserPermissions(value.userId);

  httpResponse(req, res, 200, ALL_USER_PERMISSIONS_REMOVED);
});

export const removeAllResourcePermissions = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(removeAllResourcePermissionsValidation, req.params);
  if (error) {
    return httpError(next, error, req, 422);
  }

  await permissionService.removeAllResourcePermissions(value.resourceId, value.resourceType);

  httpResponse(req, res, 200, ALL_RESOURCE_PERMISSIONS_REMOVED);
});
