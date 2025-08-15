import * as policyManager from '../services/permissionService.js';
import * as openFGAService from '../repository/permissionRepository.js';
import { logger } from '../utils/logger.js';

/**
 * OpenFGA Usage Examples
 *
 * This file demonstrates how to use the OpenFGA integration
 * for fine-grained authorization in your application.
 */

/**
 * Example 1: Organization Management
 */
export const organizationExample = async () => {
  try {
    logger.info('=== Organization Management Example ===');

    const userId = 'user123';
    const organizationId = 'org456';

    // Add user as organization owner
    await policyManager.addUserToOrganization(userId, organizationId, 'owner');
    logger.info(`✅ Added ${userId} as owner of organization ${organizationId}`);

    // Check if user can view organization
    const canView = await policyManager.checkOrganizationAccess(userId, organizationId, 'viewer');
    logger.info(`✅ User can view organization: ${canView}`);

    // Check if user can admin organization
    const canAdmin = await policyManager.checkOrganizationAccess(userId, organizationId, 'admin');
    logger.info(`✅ User can admin organization: ${canAdmin}`);

    // Get all organizations user has access to
    const userOrgs = await policyManager.getUserOrganizations(userId, 'viewer');
    logger.info(`✅ User organizations: ${JSON.stringify(userOrgs)}`);

    // Get all users in organization
    const orgUsers = await policyManager.getOrganizationUsers(organizationId, 'member');
    logger.info(`✅ Organization users: ${JSON.stringify(orgUsers)}`);
  } catch (error) {
    logger.error('Organization example failed:', error);
  }
};

/**
 * Example 2: Project Management with Inheritance
 */
export const projectExample = async () => {
  try {
    logger.info('=== Project Management Example ===');

    const userId = 'user123';
    const organizationId = 'org456';
    const projectId = 'project789';

    // Create project and link to organization
    await policyManager.createProject(userId, projectId, organizationId);
    logger.info(`✅ Created project ${projectId} owned by ${userId} in org ${organizationId}`);

    // Add another user as project editor
    const editorUserId = 'user456';
    await policyManager.addUserToProject(editorUserId, projectId, 'editor');
    logger.info(`✅ Added ${editorUserId} as editor of project ${projectId}`);

    // Check if editor can view project
    const canView = await policyManager.checkProjectAccess(editorUserId, projectId, 'viewer');
    logger.info(`✅ Editor can view project: ${canView}`);

    // Check if editor can edit project
    const canEdit = await policyManager.checkProjectAccess(editorUserId, projectId, 'editor');
    logger.info(`✅ Editor can edit project: ${canEdit}`);

    // Organization members should be able to view project through inheritance
    const orgMemberId = 'user789';
    await policyManager.addUserToOrganization(orgMemberId, organizationId, 'member');

    // This should work due to inheritance from organization
    const orgMemberCanView = await policyManager.checkProjectAccess(
      orgMemberId,
      projectId,
      'org_viewer'
    );
    logger.info(`✅ Org member can view project through inheritance: ${orgMemberCanView}`);
  } catch (error) {
    logger.error('Project example failed:', error);
  }
};

/**
 * Example 3: Document Sharing with Multi-level Inheritance
 */
export const documentExample = async () => {
  try {
    logger.info('=== Document Management Example ===');

    const userId = 'user123';
    const projectId = 'project789';
    const documentId = 'doc101';

    // Create document and link to project
    await policyManager.createDocument(userId, documentId, projectId);
    logger.info(`✅ Created document ${documentId} owned by ${userId} in project ${projectId}`);

    // Share document with specific user
    const viewerUserId = 'user999';
    await policyManager.shareDocument(viewerUserId, documentId, 'viewer');
    logger.info(`✅ Shared document ${documentId} with ${viewerUserId} as viewer`);

    // Check access
    const canView = await policyManager.checkDocumentAccess(viewerUserId, documentId, 'viewer');
    logger.info(`✅ Viewer can access document: ${canView}`);

    // Project members should be able to view document through inheritance
    const projectMemberId = 'user456'; // This user was added as project editor earlier
    const projectMemberCanView = await policyManager.checkDocumentAccess(
      projectMemberId,
      documentId,
      'project_viewer'
    );
    logger.info(`✅ Project member can view document through inheritance: ${projectMemberCanView}`);
  } catch (error) {
    logger.error('Document example failed:', error);
  }
};

/**
 * Example 4: Bulk Operations
 */
export const bulkOperationsExample = async () => {
  try {
    logger.info('=== Bulk Operations Example ===');

    const organizationId = 'org456';
    const userIds = ['user001', 'user002', 'user003', 'user004', 'user005'];

    // Bulk add users to organization
    await policyManager.bulkAddUsersToOrganization(userIds, organizationId, 'member');
    logger.info(`✅ Bulk added ${userIds.length} users to organization ${organizationId}`);

    // Get all organization members
    const members = await policyManager.getOrganizationUsers(organizationId, 'member');
    logger.info(`✅ Organization now has ${members.length} members`);

    // Bulk remove some users
    const usersToRemove = ['user004', 'user005'];
    await policyManager.bulkRemoveUsersFromOrganization(usersToRemove, organizationId, 'member');
    logger.info(`✅ Bulk removed ${usersToRemove.length} users from organization`);
  } catch (error) {
    logger.error('Bulk operations example failed:', error);
  }
};

/**
 * Example 5: Ownership Transfer
 */
export const ownershipTransferExample = async () => {
  try {
    logger.info('=== Ownership Transfer Example ===');

    const currentOwnerId = 'user123';
    const newOwnerId = 'user456';
    const projectId = 'project789';

    // Transfer project ownership
    await policyManager.transferOwnership(currentOwnerId, newOwnerId, projectId, 'project');
    logger.info(
      `✅ Transferred ownership of project ${projectId} from ${currentOwnerId} to ${newOwnerId}`
    );

    // Verify new owner has access
    const newOwnerCanOwn = await policyManager.checkProjectAccess(newOwnerId, projectId, 'owner');
    logger.info(`✅ New owner has owner access: ${newOwnerCanOwn}`);

    // Verify old owner no longer has owner access
    const oldOwnerCanOwn = await policyManager.checkProjectAccess(
      currentOwnerId,
      projectId,
      'owner'
    );
    logger.info(`✅ Old owner still has owner access: ${oldOwnerCanOwn}`);
  } catch (error) {
    logger.error('Ownership transfer example failed:', error);
  }
};

/**
 * Example 6: Advanced Queries
 */
export const advancedQueriesExample = async () => {
  try {
    logger.info('=== Advanced Queries Example ===');

    const userId = 'user123';
    const projectId = 'project789';

    // Get all permissions for a user
    const userPermissions = await policyManager.getUserPermissions(userId);
    logger.info(`✅ User permissions:`, userPermissions);

    // Get all permissions for a resource
    const resourcePermissions = await policyManager.getResourcePermissions(projectId, 'project');
    logger.info(`✅ Resource permissions:`, resourcePermissions);

    // List all objects user has access to
    const userProjects = await policyManager.getUserProjects(userId, 'viewer');
    logger.info(`✅ User can view ${userProjects.length} projects`);
  } catch (error) {
    logger.error('Advanced queries example failed:', error);
  }
};

/**
 * Example 7: Low-level OpenFGA Operations
 */
export const lowLevelExample = async () => {
  try {
    logger.info('=== Low-level OpenFGA Operations Example ===');

    // Direct OpenFGA operations
    const userId = 'user123';
    const resourceId = 'resource456';

    // Write a custom relationship
    const tuple = policyManager.buildTuple(userId, 'custom_relation', resourceId, 'custom_type');
    await openFGAService.writeRelationship(tuple);
    logger.info(`✅ Created custom relationship`);

    // Check the custom relationship
    const hasCustomAccess = await openFGAService.check(tuple);
    logger.info(`✅ User has custom access: ${hasCustomAccess}`);

    // Read all relationships for debugging
    const allRelationships = await openFGAService.readRelationships(userId);
    logger.info(`✅ User has ${allRelationships.length} total relationships`);

    // Clean up custom relationship
    await openFGAService.deleteRelationship(tuple);
    logger.info(`✅ Deleted custom relationship`);
  } catch (error) {
    logger.error('Low-level example failed:', error);
  }
};

/**
 * Example 8: Cleanup Operations
 */
export const cleanupExample = async () => {
  try {
    logger.info('=== Cleanup Operations Example ===');

    const userId = 'user999';
    const projectId = 'project789';

    // Remove all permissions for a user
    await policyManager.removeAllUserPermissions(userId);
    logger.info(`✅ Removed all permissions for user ${userId}`);

    // Remove all permissions for a resource
    await policyManager.removeAllResourcePermissions(projectId, 'project');
    logger.info(`✅ Removed all permissions for project ${projectId}`);
  } catch (error) {
    logger.error('Cleanup example failed:', error);
  }
};

/**
 * Run all examples
 */
export const runAllExamples = async () => {
  logger.info('🚀 Starting OpenFGA Examples...');

  try {
    await organizationExample();
    await projectExample();
    await documentExample();
    await bulkOperationsExample();
    await ownershipTransferExample();
    await advancedQueriesExample();
    await lowLevelExample();
    // await cleanupExample(); // Uncomment to clean up test data

    logger.info('✅ All OpenFGA examples completed successfully!');
  } catch (error) {
    logger.error('❌ OpenFGA examples failed:', error);
  }
};

// Uncomment to run examples when this file is executed directly
// if (import.meta.url === `file://${process.argv[1]}`) {
//   runAllExamples();
// }
