import * as permissionRepository from './permissionRepository.js';
import { logger } from '../../utils/logger.js';
import asyncHandler from 'express-async-handler';

const buildTuple = (user, relation, object, objectType) => ({
  user: `user:${user}`,
  relation,
  object: `${objectType}:${object}`
});

export const buildTuples = (relationships) =>
  relationships.map(({ user, relation, object, objectType = 'organization' }) =>
    buildTuple(user, relation, object, objectType)
  );

export const check = asyncHandler(async (user, relation, object, objectType) => {
  const tuple = buildTuple(user, relation, object, objectType);
  return await permissionRepository.check(tuple);
});

// Organization policies
export const addUserToOrganization = asyncHandler(async (userId, organizationId, role) => {
  const objectType = 'organization';
  const tuple = buildTuple(userId, role, organizationId, objectType);
  return await permissionRepository.writeRelationship(tuple);
});

export const removeUserFromOrganization = asyncHandler(async (userId, organizationId, role) => {
  const objectType = 'organization';
  const tuple = buildTuple(userId, role, organizationId, objectType);
  return await permissionRepository.deleteRelationship(tuple);
});

export const checkOrganizationAccess = asyncHandler(async (userId, organizationId, permission) => {
  const objectType = 'organization';
  const tuple = buildTuple(userId, permission, organizationId, objectType);
  return await permissionRepository.check(tuple);
});

export const getUserOrganizations = asyncHandler(async (userId, permission) => {
  const objectType = 'organization';
  return await permissionRepository.listObjects(userId, permission, objectType);
});

export const getOrganizationUsers = asyncHandler(async (organizationId, role) => {
  const objectType = 'organization';
  return await permissionRepository.listUsers(role, organizationId, objectType);
});

// Project policies
export const createProject = asyncHandler(async (userId, projectId, organizationId = null) => {
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

  const tuples = buildTuples(relationships);
  return await permissionRepository.batchWriteRelationships(tuples);
});

export const addUserToProject = asyncHandler(async (userId, projectId, role) => {
  const objectType = 'project';
  const tuple = buildTuple(userId, role, projectId, objectType);
  return await permissionRepository.writeRelationship(tuple);
});

export const removeUserFromProject = asyncHandler(async (userId, projectId, role) => {
  const objectType = 'project';
  const tuple = buildTuple(userId, role, projectId, objectType);
  return await permissionRepository.deleteRelationship(tuple);
});

export const checkProjectAccess = asyncHandler(async (userId, projectId, permission) => {
  const objectType = 'project';
  const tuple = buildTuple(userId, permission, projectId, objectType);
  return await permissionRepository.check(tuple);
});

export const getUserProjects = asyncHandler(async (userId, permission) => {
  const objectType = 'project';
  return await permissionRepository.listObjects(userId, permission, objectType);
});

export const getProjectUsers = asyncHandler(async (projectId, role) => {
  const objectType = 'project';
  return await permissionRepository.listUsers(role, projectId, objectType);
});

// Document policies
export const createDocument = asyncHandler(async (userId, documentId, projectId = null) => {
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

  const tuples = buildTuples(relationships);
  return await permissionRepository.batchWriteRelationships(tuples);
});

export const shareDocument = asyncHandler(async (userId, documentId, role) => {
  const objectType = 'document';
  const tuple = buildTuple(userId, role, documentId, objectType);
  return await permissionRepository.writeRelationship(tuple);
});

export const unshareDocument = asyncHandler(async (userId, documentId, role) => {
  const objectType = 'document';
  const tuple = buildTuple(userId, role, documentId, objectType);
  return await permissionRepository.deleteRelationship(tuple);
});

export const checkDocumentAccess = asyncHandler(async (userId, documentId, permission) => {
  const objectType = 'document';
  const tuple = buildTuple(userId, permission, documentId, objectType);
  return await permissionRepository.check(tuple);
});

export const getUserDocuments = asyncHandler(async (userId, permission) => {
  const objectType = 'document';
  return await permissionRepository.listObjects(userId, permission, objectType);
});

export const getDocumentUsers = asyncHandler(async (documentId, role) => {
  const objectType = 'document';
  return await permissionRepository.listUsers(role, documentId, objectType);
});

// Bulk operations
export const bulkAddUsersToOrganization = asyncHandler(async (userIds, organizationId, role) => {
  const relationships = userIds.map((userId) => ({
    user: userId,
    relation: role,
    object: organizationId,
    objectType: 'organization'
  }));
  const tuples = buildTuples(relationships);
  return await permissionRepository.batchWriteRelationships(tuples);
});

export const bulkRemoveUsersFromOrganization = asyncHandler(
  async (userIds, organizationId, role) => {
    const relationships = userIds.map((userId) => ({
      user: userId,
      relation: role,
      object: organizationId,
      objectType: 'organization'
    }));
    const tuples = buildTuples(relationships);
    return await permissionRepository.batchDeleteRelationships(tuples);
  }
);

export const transferOwnership = asyncHandler(
  async (fromUserId, toUserId, objectId, objectType) => {
    const fromTuple = buildTuple(fromUserId, 'owner', objectId, objectType);
    const toTuple = buildTuple(toUserId, 'owner', objectId, objectType);
    await permissionRepository.deleteRelationship(fromTuple);
    await permissionRepository.writeRelationship(toTuple);
    logger.info(
      `Ownership transferred from ${fromUserId} to ${toUserId} for ${objectType}:${objectId}`
    );
    return true;
  }
);

// Advanced queries
export const getUserPermissions = asyncHandler(async (userId) => {
  const [organizations, projects, documents] = await Promise.all([
    getUserOrganizations(userId, 'viewer'),
    getUserProjects(userId, 'viewer'),
    getUserDocuments(userId, 'viewer')
  ]);

  return {
    organizations,
    projects,
    documents
    // total: organizations.length + projects.length + documents.length
  };
});

export const getResourcePermissions = asyncHandler(async (resourceId, resourceType) => {
  const [owners, editors, viewers] = await Promise.all([
    permissionRepository.listUsers('owner', resourceId, resourceType),
    permissionRepository.listUsers('editor', resourceId, resourceType),
    permissionRepository.listUsers('viewer', resourceId, resourceType)
  ]);

  return {
    owners,
    editors,
    viewers,
    total: owners.length + editors.length + viewers.length
  };
});

// Cleanup operations
export const removeAllUserPermissions = asyncHandler(async (userId) => {
  const relationships = await permissionRepository.readRelationships(userId);

  if (relationships.length > 0) {
    const deleteRelationships = relationships.map((tuple) => ({
      user: tuple.key.user.replace('user:', ''),
      relation: tuple.key.relation,
      object: tuple.key.object.split(':')[1],
      objectType: tuple.key.object.split(':')[0]
    }));

    const tuples = buildTuples(deleteRelationships);
    await permissionRepository.batchDeleteRelationships(tuples);
    logger.info(`Removed ${relationships.length} permissions for user ${userId}`);
  }

  return true;
});

export const removeAllResourcePermissions = asyncHandler(async (resourceId, resourceType) => {
  const relationships = await permissionRepository.readRelationships(
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

    const tuples = buildTuples(deleteRelationships);
    await permissionRepository.batchDeleteRelationships(tuples);
    logger.info(`Removed ${relationships.length} permissions for ${resourceType}:${resourceId}`);
  }

  return true;
});
