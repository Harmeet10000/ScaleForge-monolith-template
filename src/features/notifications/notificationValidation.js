import Joi from 'joi';

/**
 * Validation schema for sending a single notification
 * Requirements: 7.3 - Input validation for notification API
 */
export const sendNotificationSchema = Joi.object({
  userId: Joi.string().required().messages({
    'string.empty': 'User ID is required',
    'any.required': 'User ID is required'
  }),
  workflowId: Joi.string().required().messages({
    'string.empty': 'Workflow ID is required',
    'any.required': 'Workflow ID is required'
  }),
  payload: Joi.object().required().messages({
    'object.base': 'Payload must be an object',
    'any.required': 'Payload is required'
  }),
  channels: Joi.array()
    .items(Joi.string().valid('sms', 'email', 'web_push', 'mobile_push', 'in_app'))
    .optional()
    .messages({
      'array.base': 'Channels must be an array',
      'any.only': 'Channel must be one of: sms, email, web_push, mobile_push, in_app'
    }),
  priority: Joi.string().valid('low', 'normal', 'high', 'critical').default('normal').messages({
    'any.only': 'Priority must be one of: low, normal, high, critical'
  }),
  metadata: Joi.object({
    source: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    scheduledAt: Joi.date().iso().optional()
  }).optional()
});

/**
 * Validation schema for sending bulk notifications
 * Requirements: 7.3 - Input validation for bulk notification API
 */
export const bulkNotificationSchema = Joi.object({
  notifications: Joi.array().items(sendNotificationSchema).min(1).max(100).required().messages({
    'array.base': 'Notifications must be an array',
    'array.min': 'At least one notification is required',
    'array.max': 'Maximum 100 notifications allowed per batch',
    'any.required': 'Notifications array is required'
  })
});

/**
 * Validation schema for broadcasting notifications
 * Requirements: 7.3 - Input validation for broadcast notification API
 */
export const broadcastNotificationSchema = Joi.object({
  workflowId: Joi.string().required().messages({
    'string.empty': 'Workflow ID is required',
    'any.required': 'Workflow ID is required'
  }),
  payload: Joi.object().required().messages({
    'object.base': 'Payload must be an object',
    'any.required': 'Payload is required'
  }),
  overrides: Joi.object().optional().messages({
    'object.base': 'Overrides must be an object'
  }),
  tenant: Joi.string().optional().messages({
    'string.base': 'Tenant must be a string'
  }),
  priority: Joi.string().valid('low', 'normal', 'high', 'critical').default('normal').messages({
    'any.only': 'Priority must be one of: low, normal, high, critical'
  }),
  metadata: Joi.object({
    source: Joi.string().optional(),
    tags: Joi.array().items(Joi.string()).optional()
  }).optional()
});

/**
 * Validation schema for updating notification preferences
 * Requirements: 6.1 - User preference management validation
 */
export const updatePreferencesSchema = Joi.object({
  channels: Joi.object({
    sms: Joi.object({
      enabled: Joi.boolean().required().messages({
        'boolean.base': 'SMS enabled must be a boolean',
        'any.required': 'SMS enabled setting is required'
      }),
      workflows: Joi.array().items(Joi.string()).optional()
    }).optional(),
    email: Joi.object({
      enabled: Joi.boolean().required().messages({
        'boolean.base': 'Email enabled must be a boolean',
        'any.required': 'Email enabled setting is required'
      }),
      workflows: Joi.array().items(Joi.string()).optional()
    }).optional(),
    web_push: Joi.object({
      enabled: Joi.boolean().required().messages({
        'boolean.base': 'Web push enabled must be a boolean',
        'any.required': 'Web push enabled setting is required'
      }),
      workflows: Joi.array().items(Joi.string()).optional()
    }).optional(),
    mobile_push: Joi.object({
      enabled: Joi.boolean().required().messages({
        'boolean.base': 'Mobile push enabled must be a boolean',
        'any.required': 'Mobile push enabled setting is required'
      }),
      workflows: Joi.array().items(Joi.string()).optional()
    }).optional(),
    in_app: Joi.object({
      enabled: Joi.boolean().required().messages({
        'boolean.base': 'In-app enabled must be a boolean',
        'any.required': 'In-app enabled setting is required'
      }),
      workflows: Joi.array().items(Joi.string()).optional()
    }).optional()
  }).optional(),
  globalSettings: Joi.object({
    doNotDisturb: Joi.object({
      enabled: Joi.boolean().optional(),
      startTime: Joi.string()
        .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .optional()
        .messages({
          'string.pattern.base': 'Start time must be in HH:MM format (24-hour)'
        }),
      endTime: Joi.string()
        .pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .optional()
        .messages({
          'string.pattern.base': 'End time must be in HH:MM format (24-hour)'
        })
    }).optional(),
    timezone: Joi.string().optional().messages({
      'string.base': 'Timezone must be a string'
    })
  }).optional()
})
  .min(1)
  .messages({
    'object.min': 'At least one preference setting must be provided'
  });
/**
 * Validation schema for device registration
 * Requirements: 3.1, 4.1 - Device registration validation for web and mobile push
 */
export const registerDeviceSchema = Joi.object({
  deviceId: Joi.string().required().messages({
    'string.empty': 'Device ID is required',
    'any.required': 'Device ID is required'
  }),
  deviceType: Joi.string().valid('web', 'ios', 'android').required().messages({
    'any.only': 'Device type must be one of: web, ios, android',
    'any.required': 'Device type is required'
  }),
  token: Joi.string().required().messages({
    'string.empty': 'Device token is required',
    'any.required': 'Device token is required'
  }),
  endpoint: Joi.string().uri().optional().messages({
    'string.uri': 'Endpoint must be a valid URI'
  }),
  keys: Joi.object({
    p256dh: Joi.string().optional(),
    auth: Joi.string().optional()
  }).optional(),
  userAgent: Joi.string().optional()
});
/**
 * Validation schema for notification history query parameters
 * Requirements: 8.1 - Query validation for notification history retrieval
 */
export const getHistorySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1'
  }),
  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 100'
  }),
  status: Joi.string().valid('pending', 'sent', 'delivered', 'failed', 'read').optional().messages({
    'any.only': 'Status must be one of: pending, sent, delivered, failed, read'
  }),
  channel: Joi.string()
    .valid('sms', 'email', 'web_push', 'mobile_push', 'in_app')
    .optional()
    .messages({
      'any.only': 'Channel must be one of: sms, email, web_push, mobile_push, in_app'
    }),
  startDate: Joi.date().iso().optional().messages({
    'date.base': 'Start date must be a valid date',
    'date.format': 'Start date must be in ISO format'
  }),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional().messages({
    'date.base': 'End date must be a valid date',
    'date.format': 'End date must be in ISO format',
    'date.min': 'End date must be after start date'
  }),
  workflowId: Joi.string().optional(),
  transactionId: Joi.string().optional()
});

/**
 * Validation schema for device unregistration
 */
export const unregisterDeviceSchema = Joi.object({
  deviceId: Joi.string().required().messages({
    'string.empty': 'Device ID is required',
    'any.required': 'Device ID is required'
  })
});

/**
 * Validation schema for notification statistics query
 */
export const getStatsSchema = Joi.object({
  startDate: Joi.date().iso().optional().messages({
    'date.base': 'Start date must be a valid date',
    'date.format': 'Start date must be in ISO format'
  }),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional().messages({
    'date.base': 'End date must be a valid date',
    'date.format': 'End date must be in ISO format',
    'date.min': 'End date must be after start date'
  }),
  groupBy: Joi.string().valid('day', 'week', 'month', 'channel', 'status').default('day').messages({
    'any.only': 'Group by must be one of: day, week, month, channel, status'
  })
});

export const scheduleNotificationSchema = Joi.object({
  userId: Joi.string().required().messages({
    'string.empty': 'User ID is required',
    'any.required': 'User ID is required'
  }),
  workflowId: Joi.string().required().messages({
    'string.empty': 'Workflow ID is required',
    'any.required': 'Workflow ID is required'
  }),
  payload: Joi.object().required().messages({
    'object.base': 'Payload must be an object',
    'any.required': 'Payload is required'
  }),
  scheduledFor: Joi.date().iso().greater('now').required().messages({
    'date.base': 'Scheduled date must be a valid date',
    'date.format': 'Scheduled date must be in ISO format',
    'date.greater': 'Scheduled date must be in the future',
    'any.required': 'Scheduled date is required'
  }),
  channels: Joi.array()
    .items(Joi.string().valid('sms', 'email', 'web_push', 'mobile_push', 'in_app'))
    .optional(),
  priority: Joi.string().valid('low', 'normal', 'high', 'critical').default('normal')
});

export const createTopicSchema = Joi.object({
  key: Joi.string().required().messages({
    'string.empty': 'Topic key is required',
    'any.required': 'Topic key is required'
  }),
  name: Joi.string().required().messages({
    'string.empty': 'Topic name is required',
    'any.required': 'Topic name is required'
  })
});

export const topicSubscribersSchema = Joi.object({
  subscriberIds: Joi.alternatives()
    .try(Joi.string(), Joi.array().items(Joi.string()).min(1))
    .required()
    .messages({
      'alternatives.types': 'Subscriber IDs must be a string or array of strings',
      'array.min': 'At least one subscriber ID is required',
      'any.required': 'Subscriber IDs are required'
    })
});

export const triggerToTopicSchema = Joi.object({
  workflowName: Joi.string().required().messages({
    'string.empty': 'Workflow name is required',
    'any.required': 'Workflow name is required'
  }),
  payload: Joi.object().required().messages({
    'object.base': 'Payload must be an object',
    'any.required': 'Payload is required'
  })
});
