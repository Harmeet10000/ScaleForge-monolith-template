import * as openFGARepository from '../repository/permissionRepository.js';
import { logger } from '../utils/logger.js';
import { catchAsync } from '../utils/catchAsync.js';

// Organization policies
export const addUserToOrganization = catchAsync(async (userId, organizationId, role) => {
  const objectType = 'organization';
  return await openFGARepository.writeRelationship(userId, role, organizationId, objectType);
});

export const removeUserFromOrganization = catchAsync(async (userId, organizationId, role) => {
  const objectType = 'organization';
  return await openFGARepository.deleteRelationship(userId, role, organizationId, objectType);
});

export const checkOrganizationAccess = catchAsync(async (userId, organizationId, permission) => {
  const objectType = 'organization';
  return await openFGARepository.check(userId, permission, organizationId, objectType);
});

export const getUserOrganizations = catchAsync(async (userId, permission) => {
  const objectType = 'organization';
  return await openFGARepository.listObjects(userId, permission, objectType);
});

export const getOrganizationUsers = catchAsync(async (organizationId, role) => {
  const objectType = 'organization';
  return await openFGARepository.listUsers(role, organizationId, objectType);
});

// Project policies
export const createProject = catchAsync(async (userId, projectId, organizationId = null) => {
  const relationships = [
    { user: userId, relation: 'owner', object: projectId, objectType: 'project' }
  ];

  if (organizationId) {
    relationships.push({
      user: organizationId,
      relation: 'organization',
      object: projectId,
      objectType: 'project'
    });
  }

  return await openFGARepository.batchWriteRelationships(relationships);
});

export const addUserToProject = catchAsync(async (userId, projectId, role) => {
  const objectType = 'project';
  return await openFGARepository.writeRelationship(userId, role, projectId, objectType);
});

export const removeUserFromProject = catchAsync(async (userId, projectId, role) => {
  const objectType = 'project';
  return await openFGARepository.deleteRelationship(userId, role, projectId, objectType);
});

export const checkProjectAccess = catchAsync(async (userId, projectId, permission) => {
  const objectType = 'project';
  return await openFGARepository.check(userId, permission, projectId, objectType);
});

export const getUserProjects = catchAsync(async (userId, permission) => {
  const objectType = 'project';
  return await openFGARepository.listObjects(userId, permission, objectType);
});

export const getProjectUsers = catchAsync(async (projectId, role) => {
  const objectType = 'project';
  return await openFGARepository.listUsers(role, projectId, objectType);
});

// Document policies
export const createDocument = catchAsync(async (userId, documentId, projectId = null) => {
  const relationships = [
    { user: userId, relation: 'owner', object: documentId, objectType: 'document' }
  ];

  if (projectId) {
    relationships.push({
      user: projectId,
      relation: 'project',
      object: documentId,
      objectType: 'document'
    });
  }

  return await openFGARepository.batchWriteRelationships(relationships);
});

export const shareDocument = catchAsync(async (userId, documentId, role) => {
  const objectType = 'document';
  return await openFGARepository.writeRelationship(userId, role, documentId, objectType);
});

export const unshareDocument = catchAsync(async (userId, documentId, role) => {
  const objectType = 'document';
  return await openFGARepository.deleteRelationship(userId, role, documentId, objectType);
});

export const checkDocumentAccess = catchAsync(async (userId, documentId, permission) => {
  const objectType = 'document';
  return await openFGARepository.check(userId, permission, documentId, objectType);
});

export const getUserDocuments = catchAsync(async (userId, permission) => {
  const objectType = 'document';
  return await openFGARepository.listObjects(userId, permission, objectType);
});

export const getDocumentUsers = catchAsync(async (documentId, role) => {
  const objectType = 'document';
  return await openFGARepository.listUsers(role, documentId, objectType);
});

// Bulk operations
export const bulkAddUsersToOrganization = catchAsync(async (userIds, organizationId, role) => {
  const relationships = userIds.map((userId) => ({
    user: userId,
    relation: role,
    object: organizationId,
    objectType: 'organization'
  }));
  return await openFGARepository.batchWriteRelationships(relationships);
});

export const bulkRemoveUsersFromOrganization = catchAsync(async (userIds, organizationId, role) => {
  const relationships = userIds.map((userId) => ({
    user: userId,
    relation: role,
    object: organizationId,
    objectType: 'organization'
  }));
  return await openFGARepository.batchDeleteRelationships(relationships);
});

export const transferOwnership = catchAsync(async (fromUserId, toUserId, objectId, objectType) => {
  await openFGARepository.deleteRelationship(fromUserId, 'owner', objectId, objectType);
  await openFGARepository.writeRelationship(toUserId, 'owner', objectId, objectType);
  logger.info(
    `Ownership transferred from ${fromUserId} to ${toUserId} for ${objectType}:${objectId}`
  );
  return true;
});

// Advanced queries
export const getUserPermissions = catchAsync(async (userId) => {
  const [organizations, projects, documents] = await Promise.all([
    getUserOrganizations(userId, 'viewer'),
    getUserProjects(userId, 'viewer'),
    getUserDocuments(userId, 'viewer')
  ]);

  return {
    organizations,
    projects,
    documents,
    total: organizations.length + projects.length + documents.length
  };
});

export const getResourcePermissions = catchAsync(async (resourceId, resourceType) => {
  const [owners, editors, viewers] = await Promise.all([
    openFGARepository.listUsers('owner', resourceId, resourceType),
    openFGARepository.listUsers('editor', resourceId, resourceType),
    openFGARepository.listUsers('viewer', resourceId, resourceType)
  ]);

  return {
    owners,
    editors,
    viewers,
    total: owners.length + editors.length + viewers.length
  };
});

// Cleanup operations
export const removeAllUserPermissions = catchAsync(async (userId) => {
  const relationships = await openFGARepository.readRelationships(userId);

  if (relationships.length > 0) {
    const deleteRelationships = relationships.map((tuple) => ({
      user: tuple.key.user.replace('user:', ''),
      relation: tuple.key.relation,
      object: tuple.key.object.split(':')[1],
      objectType: tuple.key.object.split(':')[0]
    }));

    await openFGARepository.batchDeleteRelationships(deleteRelationships);
    logger.info(`Removed ${relationships.length} permissions for user ${userId}`);
  }

  return true;
});

export const removeAllResourcePermissions = catchAsync(async (resourceId, resourceType) => {
  const relationships = await openFGARepository.readRelationships(
    null,
    null,
    resourceId,
    resourceType
  );

  if (relationships.length > 0) {
    const deleteRelationships = relationships.map((tuple) => ({
      user: tuple.key.user.replace('user:', ''),
      relation: tuple.key.relation,
      object: tuple.key.object.split(':')[1],
      objectType: tuple.key.object.split(':')[0]
    }));

    await openFGARepository.batchDeleteRelationships(deleteRelationships);
    logger.info(`Removed ${relationships.length} permissions for ${resourceType}:${resourceId}`);
  }

  return true;
});
