import { openFGAService } from './openFGAService.js';
import { logger } from '../utils/logger.js';

// Organization policies
export const addUserToOrganization = async (userId, organizationId, role = 'member') => {
  const validRoles = ['owner', 'admin', 'member', 'viewer'];
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role: ${role}. Valid roles: ${validRoles.join(', ')}`);
  }
  return await openFGAService.writeRelationship(userId, role, organizationId, 'organization');
};

export const removeUserFromOrganization = async (userId, organizationId, role = 'member') => {
   await openFGAService.deleteRelationship(userId, role, organizationId, 'organization');
};

export const checkOrganizationAccess = async (userId, organizationId, permission = 'viewer') => {
   await openFGAService.check(userId, permission, organizationId, 'organization');
};

export const getUserOrganizations = async (userId, permission = 'viewer') => {
   await openFGAService.listObjects(userId, permission, 'organization');
};

export const getOrganizationUsers = async (organizationId, role = 'member') => {
   await openFGAService.listUsers(role, organizationId, 'organization');
};

// Project policies
export const createProject = async (userId, projectId, organizationId = null) => {
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

  return await openFGAService.batchWriteRelationships(relationships);
};

export const addUserToProject = async (userId, projectId, role = 'viewer') => {
  const validRoles = ['owner', 'editor', 'viewer'];
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role: ${role}. Valid roles: ${validRoles.join(', ')}`);
  }
  return await openFGAService.writeRelationship(userId, role, projectId, 'project');
};

export const removeUserFromProject = async (userId, projectId, role = 'viewer') => {
   await openFGAService.deleteRelationship(userId, role, projectId, 'project');
};

export const checkProjectAccess = async (userId, projectId, permission = 'viewer') => {
   await openFGAService.check(userId, permission, projectId, 'project');
};

export const getUserProjects = async (userId, permission = 'viewer') => {
   await openFGAService.listObjects(userId, permission, 'project');
};

export const getProjectUsers = async (projectId, role = 'viewer') => {
   await openFGAService.listUsers(role, projectId, 'project');
};

// Document policies
export const createDocument = async (userId, documentId, projectId = null) => {
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

  return await openFGAService.batchWriteRelationships(relationships);
};

export const shareDocument = async (userId, documentId, role = 'viewer') => {
  const validRoles = ['owner', 'editor', 'viewer'];
  if (!validRoles.includes(role)) {
    throw new Error(`Invalid role: ${role}. Valid roles: ${validRoles.join(', ')}`);
  }
  return await openFGAService.writeRelationship(userId, role, documentId, 'document');
};

export const unshareDocument = async (userId, documentId, role = 'viewer') => {
   await openFGAService.deleteRelationship(userId, role, documentId, 'document');
};

export const checkDocumentAccess = async (userId, documentId, permission = 'viewer') => {
   await openFGAService.check(userId, permission, documentId, 'document');
};

export const getUserDocuments = async (userId, permission = 'viewer') => {
   await openFGAService.listObjects(userId, permission, 'document');
};

export const getDocumentUsers = async (documentId, role = 'viewer') => {
   await openFGAService.listUsers(role, documentId, 'document');
};

// Bulk operations
export const bulkAddUsersToOrganization = async (userIds, organizationId, role = 'member') => {
  const relationships = userIds.map(userId => ({
    user: userId,
    relation: role,
    object: organizationId,
    objectType: 'organization'
  }));
  return await openFGAService.batchWriteRelationships(relationships);
};

export const bulkRemoveUsersFromOrganization = async (userIds, organizationId, role = 'member') => {
  const relationships = userIds.map(userId => ({
    user: userId,
    relation: role,
    object: organizationId,
    objectType: 'organization'
  }));
  return await openFGAService.batchDeleteRelationships(relationships);
};

export const transferOwnership = async (fromUserId, toUserId, objectId, objectType) => {
  await openFGAService.deleteRelationship(fromUserId, 'owner', objectId, objectType);
  await openFGAService.writeRelationship(toUserId, 'owner', objectId, objectType);
  logger.info(`Ownership transferred from ${fromUserId} to ${toUserId} for ${objectType}:${objectId}`);
  return true;
};

// Advanced queries
export const getUserPermissions = async (userId) => {
  try {
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
  } catch (error) {
    logger.error('Failed to get user permissions:', error);
    throw error;
  }
};

export const getResourcePermissions = async (resourceId, resourceType) => {
  try {
    const [owners, editors, viewers] = await Promise.all([
      openFGAService.listUsers('owner', resourceId, resourceType),
      openFGAService.listUsers('editor', resourceId, resourceType),
      openFGAService.listUsers('viewer', resourceId, resourceType)
    ]);

    return {
      owners,
      editors,
      viewers,
      total: owners.length + editors.length + viewers.length
    };
  } catch (error) {
    logger.error('Failed to get resource permissions:', error);
    throw error;
  }
};

// Cleanup operations
export const removeAllUserPermissions = async (userId) => {
  try {
    const relationships = await openFGAService.readRelationships(userId);

    if (relationships.length > 0) {
      const deleteRelationships = relationships.map(tuple => ({
        user: tuple.key.user.replace('user:', ''),
        relation: tuple.key.relation,
        object: tuple.key.object.split(':')[1],
        objectType: tuple.key.object.split(':')[0]
      }));

      await openFGAService.batchDeleteRelationships(deleteRelationships);
      logger.info(`Removed ${relationships.length} permissions for user ${userId}`);
    }

    return true;
  } catch (error) {
    logger.error('Failed to remove all user permissions:', error);
    throw error;
  }
};

export const removeAllResourcePermissions = async (resourceId, resourceType) => {
  try {
    const relationships = await openFGAService.readRelationships(null, null, resourceId, resourceType);

    if (relationships.length > 0) {
      const deleteRelationships = relationships.map(tuple => ({
        user: tuple.key.user.replace('user:', ''),
        relation: tuple.key.relation,
        object: tuple.key.object.split(':')[1],
        objectType: tuple.key.object.split(':')[0]
      }));

      await openFGAService.batchDeleteRelationships(deleteRelationships);
      logger.info(`Removed ${relationships.length} permissions for ${resourceType}:${resourceId}`);
    }

    return true;
  } catch (error) {
    logger.error('Failed to remove all resource permissions:', error);
    throw error;
  }
};
