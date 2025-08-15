import Joi from 'joi';

// Organization validations
export const addUserToOrganizationValidation = Joi.object({
  userId: Joi.string().required(),
  role: Joi.string().valid('owner', 'admin', 'editor', 'member', 'viewer').default('member'),
  organizationId: Joi.string().required()
});

export const removeUserFromOrganizationValidation = Joi.object({
  userId: Joi.string().required(),
  role: Joi.string().valid('owner', 'admin', 'editor', 'member', 'viewer').default('member'),
  organizationId: Joi.string().required()
});

export const getOrganizationUsersValidation = Joi.object({
  organizationId: Joi.string().required(),
  role: Joi.string().valid('owner', 'admin', 'editor', 'member', 'viewer').default('member')
});

export const getUserOrganizationsValidation = Joi.object({
  userId: Joi.string().required(),
  permission: Joi.string().valid('owner', 'admin', 'editor', 'member', 'viewer').default('viewer')
});

export const bulkAddUsersToOrganizationValidation = Joi.object({
  userIds: Joi.array().items(Joi.string()).min(1).required(),
  role: Joi.string().valid('owner', 'admin', 'editor', 'member', 'viewer').default('member'),
  organizationId: Joi.string().required()
});

export const bulkRemoveUsersFromOrganizationValidation = Joi.object({
  userIds: Joi.array().items(Joi.string()).min(1).required(),
  role: Joi.string().valid('owner', 'admin', 'editor', 'member', 'viewer').default('member'),
  organizationId: Joi.string().required()
});

// Project validations
export const createProjectValidation = Joi.object({
  projectId: Joi.string().required(),
  organizationId: Joi.string().optional()
});

export const addUserToProjectValidation = Joi.object({
  userId: Joi.string().required(),
  role: Joi.string().valid('owner', 'editor', 'viewer').default('viewer'),
  projectId: Joi.string().required()
});

export const removeUserFromProjectValidation = Joi.object({
  userId: Joi.string().required(),
  role: Joi.string().valid('owner', 'editor', 'viewer').default('viewer'),
  projectId: Joi.string().required()
});

export const getProjectUsersValidation = Joi.object({
  projectId: Joi.string().required(),
  role: Joi.string().valid('owner', 'editor', 'viewer').default('viewer')
});

export const getUserProjectsValidation = Joi.object({
  userId: Joi.string().required(),
  permission: Joi.string().valid('owner', 'editor', 'viewer').default('viewer')
});

// Document validations
export const createDocumentValidation = Joi.object({
  documentId: Joi.string().required(),
  projectId: Joi.string().optional()
});

export const shareDocumentValidation = Joi.object({
  userId: Joi.string().required(),
  role: Joi.string().valid('owner', 'editor', 'viewer').default('viewer'),
  documentId: Joi.string().required()
});

export const unshareDocumentValidation = Joi.object({
  userId: Joi.string().required(),
  role: Joi.string().valid('owner', 'editor', 'viewer').default('viewer'),
  documentId: Joi.string().required()
});

export const getDocumentUsersValidation = Joi.object({
  documentId: Joi.string().required(),
  role: Joi.string().valid('owner', 'editor', 'viewer').default('viewer')
});

export const getUserDocumentsValidation = Joi.object({
  userId: Joi.string().required(),
  permission: Joi.string().valid('owner', 'editor', 'viewer').default('viewer')
});

// Transfer ownership validation
export const transferOwnershipValidation = Joi.object({
  toUserId: Joi.string().required(),
  resourceId: Joi.string().required(),
  resourceType: Joi.string().valid('organization', 'project', 'document').required()
});

// Advanced query validations
export const getUserPermissionsValidation = Joi.object({
  userId: Joi.string().required()
});

export const getResourcePermissionsValidation = Joi.object({
  resourceId: Joi.string().required(),
  resourceType: Joi.string().valid('organization', 'project', 'document').required()
});

// Access check validation
export const checkAccessValidation = Joi.object({
  userId: Joi.string().required(),
  resourceId: Joi.string().required(),
  resourceType: Joi.string().valid('organization', 'project', 'document').required(),
  relation: Joi.string().valid('owner', 'admin', 'editor', 'member', 'viewer').default('viewer')
});

// Cleanup validations
export const removeAllUserPermissionsValidation = Joi.object({
  userId: Joi.string().required()
});

export const removeAllResourcePermissionsValidation = Joi.object({
  resourceId: Joi.string().required(),
  resourceType: Joi.string().valid('organization', 'project', 'document').required()
});

export const validateJoiSchema = (schema, value) => {
  const result = schema.validate(value);

  return {
    value: result.value,
    error: result.error
  };
};
