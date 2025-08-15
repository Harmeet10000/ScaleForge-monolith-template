export const NOT_LOGGED_IN = 'You are not logged in! Please log in to get access.';
export const TOKEN_INVALID_FOR_IP = 'Token is not valid for this IP address.';
export const USER_NO_LONGER_EXISTS = 'The user belonging to this token no longer exists.';
export const USER_CHANGED_PASSWORD = 'User recently changed password! Please log in again.';
export const NO_PERMISSION = 'You do not have permission to perform this action';
export const GOOGLE_OAUTH_SIGNUP_SUCCESS = 'Google OAuth signup successful';
export const GOOGLE_OAUTH_LOGIN_SUCCESS = 'Google OAuth login successful';
export const SUCCESS = 'The operation has been successful';
export const SOMETHING_WENT_WRONG = 'Something went wrong!';
export const NOT_FOUND = (entity) => `${entity} not found`;
export const TOO_MANY_REQUESTS = 'Too many requests! Please try again after some time';
export const ALREADY_EXIST = (entity, identifier) => `${entity} already exist with ${identifier}`;
export const INVALID_PHONE_NUMBER = `Invalid phone number`;
export const INVALID_TIMEZONE = `Invalid timezone`;
export const INVALID_EMAIL = `Invalid email address`;
export const INVALID_PASSWORD = `Invalid password`;
export const INVALID_ACCOUNT_CONFIRMATION_EMAIL_OR_CODE = `Invalid account confirmation token or code`;
export const ACCOUNT_ALREADY_CONFIRMED = `Account already confirmed`;
export const INVALID_EMAIL_OR_PASSWORD = `Invalid email address or password`;
export const UNAUTHORIZED = `You are not authorized to perform this action`;
export const ACCOUNT_CONFIRMATION_REQUIRED = `Account Confirmation Required`;
export const EXPIRED_URL = `Your password reset url is expired`;
export const INVALID_REQUEST = `Invalid request`;
export const INVALID_OLD_PASSWORD = `Invalid old password`;
export const PASSWORD_MATCHING_WITH_OLD_PASSWORD = `Password matching with old password`;
// Permission response messages
export const USER_ADDED_TO_ORGANIZATION = 'User added to organization successfully';
export const USER_REMOVED_FROM_ORGANIZATION = 'User removed from organization successfully';
export const ORGANIZATION_USERS_RETRIEVED = 'Organization users retrieved successfully';
export const USER_ORGANIZATIONS_RETRIEVED = 'User organizations retrieved successfully';

export const PROJECT_CREATED = 'Project created with permissions successfully';
export const USER_ADDED_TO_PROJECT = 'User added to project successfully';
export const USER_REMOVED_FROM_PROJECT = 'User removed from project successfully';
export const PROJECT_USERS_RETRIEVED = 'Project users retrieved successfully';
export const USER_PROJECTS_RETRIEVED = 'User projects retrieved successfully';

export const DOCUMENT_CREATED = 'Document created with permissions successfully';
export const DOCUMENT_SHARED = 'Document shared successfully';
export const DOCUMENT_UNSHARED = 'Document unshared successfully';
export const DOCUMENT_USERS_RETRIEVED = 'Document users retrieved successfully';
export const USER_DOCUMENTS_RETRIEVED = 'User documents retrieved successfully';

export const USERS_ADDED_TO_ORGANIZATION = 'users added to organization successfully';
export const USERS_REMOVED_FROM_ORGANIZATION = 'users removed from organization successfully';

export const OWNERSHIP_TRANSFERRED = 'Ownership transferred successfully';
export const USER_PERMISSIONS_RETRIEVED = 'User permissions retrieved successfully';
export const RESOURCE_PERMISSIONS_RETRIEVED = 'Resource permissions retrieved successfully';
export const ACCESS_CHECK_COMPLETED = 'Access check completed';
export const ALL_USER_PERMISSIONS_REMOVED = 'All user permissions removed successfully';
export const ALL_RESOURCE_PERMISSIONS_REMOVED = 'All resource permissions removed successfully';
