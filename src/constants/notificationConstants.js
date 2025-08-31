export const NOTIFICATION_MESSAGES = {
  // Success messages for notification operations
  NOTIFICATION_SENT_SUCCESS: 'Notification sent successfully',
  BROADCAST_SENT_SUCCESS: 'Broadcast sent successfully',
  BULK_NOTIFICATIONS_SENT_SUCCESS: 'Bulk notifications sent successfully',
  NOTIFICATION_QUEUED_SUCCESS: 'Notification queued for delivery',
  NOTIFICATION_SCHEDULED_SUCCESS: 'Notification scheduled successfully',

  // Success messages for history and analytics
  HISTORY_RETRIEVED_SUCCESS: 'Notification history retrieved successfully',
  NOTIFICATION_STATS_RETRIEVED_SUCCESS: 'Notification statistics retrieved successfully',
  NOTIFICATION_DETAILS_RETRIEVED_SUCCESS: 'Notification details retrieved successfully',

  // Success messages for preference management
  PREFERENCES_UPDATED_SUCCESS: 'Notification preferences updated successfully',
  PREFERENCES_RETRIEVED_SUCCESS: 'Notification preferences retrieved successfully',
  PREFERENCES_RESET_SUCCESS: 'Notification preferences reset to defaults',
  GLOBAL_PREFERENCES_UPDATED_SUCCESS: 'Global notification preferences updated successfully',
  CHANNEL_PREFERENCES_UPDATED_SUCCESS: 'Channel preferences updated successfully',

  // Success messages for device management
  DEVICE_REGISTERED_SUCCESS: 'Device registered successfully',
  DEVICE_UNREGISTERED_SUCCESS: 'Device unregistered successfully',
  DEVICE_UPDATED_SUCCESS: 'Device information updated successfully',
  ALL_DEVICES_RETRIEVED_SUCCESS: 'All user devices retrieved successfully',
  DEVICE_TOKEN_REFRESHED_SUCCESS: 'Device token refreshed successfully',

  // Success messages for subscriber management
  SUBSCRIBER_CREATED_SUCCESS: 'Subscriber created successfully',
  SUBSCRIBER_UPDATED_SUCCESS: 'Subscriber information updated successfully',
  SUBSCRIBER_DELETED_SUCCESS: 'Subscriber deleted successfully',
  SUBSCRIBER_RETRIEVED_SUCCESS: 'Subscriber information retrieved successfully',

  // Success messages for workflow management
  WORKFLOW_TRIGGERED_SUCCESS: 'Workflow triggered successfully',
  WORKFLOW_STATUS_RETRIEVED_SUCCESS: 'Workflow status retrieved successfully',

  // Success messages for channel-specific operations
  SMS_SENT_SUCCESS: 'SMS notification sent successfully',
  EMAIL_SENT_SUCCESS: 'Email notification sent successfully',
  WEB_PUSH_SENT_SUCCESS: 'Web push notification sent successfully',
  MOBILE_PUSH_SENT_SUCCESS: 'Mobile push notification sent successfully',
  IN_APP_SENT_SUCCESS: 'In-app notification sent successfully',

  // Connection and service messages
  NOVU_CONNECTION_SUCCESS: 'Successfully connected to Novu service',
  NOVU_HEALTH_CHECK_SUCCESS: 'Novu service health check passed',

  // Error messages - Connection and service errors
  NOVU_CONNECTION_FAILED: 'Failed to connect to Novu service',
  NOVU_SERVICE_UNAVAILABLE: 'Novu service is currently unavailable',
  NOVU_API_RATE_LIMIT_EXCEEDED: 'Novu API rate limit exceeded, please try again later',
  NOVU_AUTHENTICATION_FAILED: 'Failed to authenticate with Novu service',
  NOVU_CONFIGURATION_INVALID: 'Invalid Novu configuration detected',
  NOVU_HEALTH_CHECK_FAILED: 'Novu service health check failed',

  // Error messages - Validation errors
  INVALID_WORKFLOW_ID: 'Invalid workflow identifier provided',
  INVALID_SUBSCRIBER_ID: 'Invalid subscriber identifier provided',
  INVALID_DEVICE_ID: 'Invalid device identifier provided',
  INVALID_NOTIFICATION_PAYLOAD: 'Invalid notification payload provided',
  INVALID_PHONE_NUMBER_FORMAT: 'Invalid phone number format',
  INVALID_EMAIL_FORMAT: 'Invalid email address format',
  INVALID_DEVICE_TOKEN: 'Invalid device token provided',
  INVALID_CHANNEL_TYPE: 'Invalid notification channel type',
  INVALID_PRIORITY_LEVEL: 'Invalid notification priority level',
  INVALID_PREFERENCE_SETTINGS: 'Invalid preference settings provided',

  // Error messages - Subscriber errors
  SUBSCRIBER_NOT_FOUND: 'Subscriber not found',
  SUBSCRIBER_ALREADY_EXISTS: 'Subscriber already exists',
  SUBSCRIBER_CREATION_FAILED: 'Failed to create subscriber',
  SUBSCRIBER_UPDATE_FAILED: 'Failed to update subscriber information',
  SUBSCRIBER_DELETION_FAILED: 'Failed to delete subscriber',

  // Error messages - Device management errors
  DEVICE_NOT_FOUND: 'Device not found',
  DEVICE_ALREADY_REGISTERED: 'Device already registered',
  DEVICE_REGISTRATION_FAILED: 'Failed to register device',
  DEVICE_UNREGISTRATION_FAILED: 'Failed to unregister device',
  DEVICE_TOKEN_INVALID: 'Device token is invalid or expired',
  DEVICE_TOKEN_REFRESH_FAILED: 'Failed to refresh device token',

  // Error messages - Notification sending errors
  NOTIFICATION_SEND_FAILED: 'Failed to send notification',
  BULK_NOTIFICATION_SEND_FAILED: 'Failed to send bulk notifications',
  NOTIFICATION_QUEUE_FULL: 'Notification queue is full, please try again later',
  NOTIFICATION_TIMEOUT: 'Notification sending timed out',
  NOTIFICATION_CANCELLED: 'Notification was cancelled',

  // Error messages - Channel-specific errors
  SMS_SEND_FAILED: 'Failed to send SMS notification',
  EMAIL_SEND_FAILED: 'Failed to send email notification',
  WEB_PUSH_SEND_FAILED: 'Failed to send web push notification',
  MOBILE_PUSH_SEND_FAILED: 'Failed to send mobile push notification',
  IN_APP_SEND_FAILED: 'Failed to send in-app notification',

  // Error messages - Workflow errors
  WORKFLOW_NOT_FOUND: 'Workflow not found',
  WORKFLOW_TRIGGER_FAILED: 'Failed to trigger workflow',
  WORKFLOW_EXECUTION_FAILED: 'Workflow execution failed',
  WORKFLOW_TIMEOUT: 'Workflow execution timed out',

  // Error messages - Preference management errors
  PREFERENCES_NOT_FOUND: 'Notification preferences not found',
  PREFERENCES_UPDATE_FAILED: 'Failed to update notification preferences',
  PREFERENCES_RETRIEVAL_FAILED: 'Failed to retrieve notification preferences',
  INVALID_TIMEZONE_SETTING: 'Invalid timezone setting provided',
  INVALID_DND_SETTINGS: 'Invalid do-not-disturb settings provided',

  // Error messages - History and analytics errors
  HISTORY_RETRIEVAL_FAILED: 'Failed to retrieve notification history',
  STATS_RETRIEVAL_FAILED: 'Failed to retrieve notification statistics',
  NOTIFICATION_DETAILS_NOT_FOUND: 'Notification details not found',

  // Error messages - Permission and authorization errors
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions to perform this action',
  UNAUTHORIZED_SUBSCRIBER_ACCESS: 'Unauthorized access to subscriber data',
  UNAUTHORIZED_DEVICE_ACCESS: 'Unauthorized access to device information',

  // Error messages - Data and storage errors
  DATABASE_CONNECTION_FAILED: 'Database connection failed',
  DATA_PERSISTENCE_FAILED: 'Failed to persist notification data',
  DATA_RETRIEVAL_FAILED: 'Failed to retrieve notification data',
  DATA_CORRUPTION_DETECTED: 'Data corruption detected in notification records',

  // Error messages - General system errors
  INTERNAL_SERVER_ERROR: 'Internal server error occurred',
  SERVICE_TEMPORARILY_UNAVAILABLE: 'Notification service temporarily unavailable',
  MAINTENANCE_MODE_ACTIVE: 'Notification service is in maintenance mode',
  FEATURE_NOT_AVAILABLE: 'This notification feature is not available',
  QUOTA_EXCEEDED: 'Notification quota exceeded for this period',

  // Warning messages
  NOTIFICATION_PARTIALLY_SENT: 'Notification was partially sent across channels',
  SOME_DEVICES_UNREACHABLE: 'Some devices were unreachable during notification delivery',
  PREFERENCE_SYNC_WARNING: 'Preference synchronization with Novu may be delayed',
  DELIVERY_DELAYED: 'Notification delivery may be delayed due to high volume'
};

// Notification channel types
export const NOTIFICATION_CHANNELS = {
  SMS: 'sms',
  EMAIL: 'email',
  WEB_PUSH: 'web_push',
  MOBILE_PUSH: 'mobile_push',
  IN_APP: 'in_app'
};

// Notification priority levels
export const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Notification status types
export const NOTIFICATION_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  FAILED: 'failed',
  READ: 'read',
  CANCELLED: 'cancelled'
};

// Device types
export const DEVICE_TYPES = {
  WEB: 'web',
  IOS: 'ios',
  ANDROID: 'android'
};

// Error codes for programmatic handling
export const NOTIFICATION_ERROR_CODES = {
  NOVU_CONNECTION_ERROR: 'NOVU_CONNECTION_ERROR',
  NOVU_VALIDATION_ERROR: 'NOVU_VALIDATION_ERROR',
  NOVU_RATE_LIMIT_ERROR: 'NOVU_RATE_LIMIT_ERROR',
  SUBSCRIBER_ERROR: 'SUBSCRIBER_ERROR',
  DEVICE_ERROR: 'DEVICE_ERROR',
  WORKFLOW_ERROR: 'WORKFLOW_ERROR',
  NOTIFICATION_ERROR: 'NOTIFICATION_ERROR',
  PREFERENCE_ERROR: 'PREFERENCE_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  DATA_ERROR: 'DATA_ERROR',
  SYSTEM_ERROR: 'SYSTEM_ERROR'
};
