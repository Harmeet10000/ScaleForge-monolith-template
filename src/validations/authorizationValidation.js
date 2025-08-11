import Joi from 'joi';

// Common schemas
const userIdSchema = Joi.string().required().messages({
  'string.empty': 'User ID is required',
  'any.required': 'User ID is required'
});

const resourceIdSchema = Joi.string().required().messages({
  'string.empty': 'Resource ID is required',
  'any.required': 'Resource ID is required'
});

const roleSchema = Joi.string().valid('owner', 'admin', 'editor', 'member', 'viewer').messages({
  'any.only': 'Role must be one of: owner, admin, editor, member, viewer'
});

const permissionSchema = Joi.string().valid('owner', 'admin', 'editor', 'member', 'viewer').messages({
  'any.only': 'Permission must be one of: owner, admin, editor, member, viewer'
});

const resourceTypeSchema = Joi.string().valid('organization', 'project', 'document').required().messages({
  'any.only': 'Resource type must be one of: organization, project, document',
  'any.required': 'Resource type is required'
});

// Organization validations
export const addUserToOrganizationValidation = Joi.object({
  body: Joi.object({
    userId: userIdSchema,
    role: roleSchema.default('member')
  }),
  params: Joi.object({
    organizationId: resourceIdSchema
  })
});

export const removeUserFromOrganizationValidation = Joi.object({
  body: Joi.object({
    userId: userIdSchema,
    role: roleSchema.default('member')
  }),
  params: Joi.object({
    organizationId: resourceIdSchema
  })
});

export const getOrganizationUsersValidation = Joi.object({
  params: Joi.object({
    organizationId: resourceIdSchema
  }),
  query: Joi.object({
    role: roleSchema.default('member')
  })
});

export const getUserOrganizationsValidation = Joi.object({
  params: Joi.object({
    userId: userIdSchema
  }),
  query: Joi.object({
    permission: permissionSchema.default('viewer')
  })
});

export const bulkAddUsersToOrganizationValidation = Joi.object({
  body: Joi.object({
    userIds: Joi.array().items(Joi.string()).min(1).required().messages({
      'array.min': 'At least one user ID is required',
      'any.required': 'User IDs array is required'
    }),
    role: roleSchema.default('member')
  }),
  params: Joi.object({
    organizationId: resourceIdSchema
  })
});

export const bulkRemoveUsersFromOrganizationValidation = Joi.object({
  body: Joi.object({
    userIds: Joi.array().items(Joi.string()).min(1).required().messages({
      'array.min': 'At least one user ID is required',
      'any.required': 'User IDs array is required'
    }),
    role: roleSchema.default('member')
  }),
  params: Joi.object({
    organizationId: resourceIdSchema
  })
});

// Project validations
export const createProjectValidation = Joi.object({
  body: Joi.object({
    projectId: resourceIdSchema,
    organizationId: Joi.string().optional()
  })
});

export const addUserToProjectValidation = Joi.object({
  body: Joi.object({
    userId: userIdSchema,
    role: Joi.string().valid('owner', 'editor', 'viewer').default('viewer').messages({
      'any.only': 'Project role must be one of: owner, editor, viewer'
    })
  }),
  params: Joi.object({
    projectId: resourceIdSchema
  })
});

export const removeUserFromProjectValidation = Joi.object({
  body: Joi.object({
    userId: userIdSchema,
    role: Joi.string().valid('owner', 'editor', 'viewer').default('viewer').messages({
      'any.only': 'Project role must be one of: owner, editor, viewer'
    })
  }),
  params: Joi.object({
    projectId: resourceIdSchema
  })
});

export const getProjectUsersValidation = Joi.object({
  params: Joi.object({
    projectId: resourceIdSchema
  }),
  query: Joi.object({
    role: Joi.string().valid('owner', 'editor', 'viewer').default('viewer').messages({
      'any.only': 'Project role must be one of: owner, editor, viewer'
    })
  })
});

export const getUserProjectsValidation = Joi.object({
  params: Joi.object({
    userId: userIdSchema
  }),
  query: Joi.object({
    permission: Joi.string().valid('owner', 'editor', 'viewer').default('viewer').messages({
      'any.only': 'Project permission must be one of: owner, editor, viewer'
    })
  })
});

// Document validations
export const createDocumentValidation = Joi.object({
  body: Joi.object({
    documentId: resourceIdSchema,
    projectId: Joi.string().optional()
  })
});

export const shareDocumentValidation = Joi.object({
  body: Joi.object({
    userId: userIdSchema,
    role: Joi.string().valid('owner', 'editor', 'viewer').default('viewer').messages({
      'any.only': 'Document role must be one of: owner, editor, viewer'
    })
  }),
  params: Joi.object({
    documentId: resourceIdSchema
  })
});

export const unshareDocumentValidation = Joi.object({
  body: Joi.object({
    userId: userIdSchema,
    role: Joi.string().valid('owner', 'editor', 'viewer').default('viewer').messages({
      'any.only': 'Document role must be one of: owner, editor, viewer'
    })
  }),
  params: Joi.object({
    documentId: resourceIdSchema
  })
});

export const getDocumentUsersValidation = Joi.object({
  params: Joi.object({
    documentId: resourceIdSchema
  }),
  query: Joi.object({
    role: Joi.string().valid('owner', 'editor', 'viewer').default('viewer').messages({
      'any.only': 'Document role must be one of: owner, editor, viewer'
    })
  })
});

export const getUserDocumentsValidation = Joi.object({
  params: Joi.object({
    userId: userIdSchema
  }),
  query: Joi.object({
    permission: Joi.string().valid('owner', 'editor', 'viewer').default('viewer').messages({
      'any.only': 'Document permission must be one of: owner, editor, viewer'
    })
  })
});

// Transfer ownership validation
export const transferOwnershipValidation = Joi.object({
  body: Joi.object({
    toUserId: userIdSchema
  }),
  params: Joi.object({
    resourceId: resourceIdSchema,
    resourceType: resourceTypeSchema
  })
});

// Advanced query validations
export const getUserPermissionsValidation = Joi.object({
  params: Joi.object({
    userId: userIdSchema
  })
});

export const getResourcePermissionsValidation = Joi.object({
  params: Joi.object({
    resourceId: resourceIdSchema,
    resourceType: resourceTypeSchema
  })
});

// Access check validation
export const checkAccessValidation = Joi.object({
  body: Joi.object({
    userId: userIdSchema,
    resourceId: resourceIdSchema,
    resourceType: resourceTypeSchema,
    permission: permissionSchema.default('viewer')
  })
});

// Cleanup validations
export const removeAllUserPermissionsValidation = Joi.object({
  params: Joi.object({
    userId: userIdSchema
  })
});

export const removeAllResourcePermissionsValidation = Joi.object({
  params: Joi.object({
    resourceId: resourceIdSchema,
    resourceType: resourceTypeSchema
  })
});

// Validation middleware factory
export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate({
      body: req.body,
      params: req.params,
      query: req.query
    });

    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: errorMessage
      });
    }

    next();
  };
};