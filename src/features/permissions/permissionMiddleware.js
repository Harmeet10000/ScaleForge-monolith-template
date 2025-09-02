import * as permissionService from './permissionService.js';
import { httpError } from '../../utils/httpError.js';
import { logger } from '../../utils/logger.js';

// Generic authorization middleware factory
export const authorize = (resourceType, permission = 'viewer', options = {}) => {
  async (req, res, next) => {
    try {
      const userId = req.user?.id || req.user?._id;
      if (!userId) {
        return next(httpError(401, 'Authentication required'));
      }

      // Extract resource ID from request
      const resourceId = options.resourceIdParam
        ? req.params[options.resourceIdParam]
        : req.params.id || req.params.resourceId;

      if (!resourceId) {
        return next(httpError(400, 'Resource ID is required'));
      }

      // Check authorization
      const hasAccess = await permissionService.check(
        userId.toString(),
        permission,
        resourceId,
        resourceType
      );

      if (!hasAccess) {
        logger.warn(
          `Access denied: User ${userId} lacks ${permission} permission for ${resourceType}:${resourceId}`
        );
        return next(httpError(403, 'Insufficient permissions'));
      }

      // Store resource info in request for later use
      req.authorizedResource = {
        id: resourceId,
        type: resourceType,
        permission
      };

      next();
    } catch (error) {
      logger.error('Authorization middleware error:', error);
      next(httpError(500, 'Authorization check failed'));
    }
  };
};

// Specific authorization middlewares
export const authorizeOrganization = (permission = 'viewer') =>
  authorize('organization', permission, { resourceIdParam: 'organizationId' });

export const authorizeProject = (permission = 'viewer') =>
  authorize('project', permission, { resourceIdParam: 'projectId' });

export const authorizeDocument = (permission = 'viewer') =>
  authorize('document', permission, { resourceIdParam: 'documentId' });

// Multiple resource authorization
export const authorizeMultiple = (checks) => {
  async (req, res, next) => {
    try {
      const userId = req.user?.id || req.user?._id;
      if (!userId) {
        return next(httpError(401, 'Authentication required'));
      }

      const results = await Promise.all(
        checks.map(async ({ resourceType, permission, resourceIdParam }) => {
          const resourceId = req.params[resourceIdParam];
          if (!resourceId) {
            return false;
          }

          return await permissionService.check(
            userId.toString(),
            permission,
            resourceId,
            resourceType
          );
        })
      );

      const hasAccess = results.every((result) => result === true);

      if (!hasAccess) {
        return next(httpError(403, 'Insufficient permissions for one or more resources'));
      }

      next();
    } catch (error) {
      logger.error('Multiple authorization middleware error:', error);
      next(httpError(500, 'Authorization check failed'));
    }
  };
};

// Role-based authorization (for backward compatibility)
export const requireRole = (requiredRoles) => {
  async (req, res, next) => {
    try {
      const userId = req.user?.id || req.user?._id;
      const userRole = req.user?.role;

      if (!userId) {
        return next(httpError(401, 'Authentication required'));
      }

      // Convert single role to array
      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

      if (!roles.includes(userRole)) {
        return next(httpError(403, 'Insufficient role permissions'));
      }

      next();
    } catch (error) {
      logger.error('Role authorization middleware error:', error);
      next(httpError(500, 'Role check failed'));
    }
  };
};

// Owner-only authorization
export const requireOwnership = (resourceType) => {
  authorize(resourceType, 'owner');
};

// Editor or owner authorization
export const requireEditor = (resourceType) => {
  authorize(resourceType, 'editor');
};

// Conditional authorization based on request data
export const conditionalAuthorize = (condition) => {
  async (req, res, next) => {
    try {
      const shouldAuthorize = await condition(req);

      if (!shouldAuthorize) {
        return next();
      }

      // If condition is met, perform authorization
      const { resourceType, permission, resourceId } = shouldAuthorize;
      const userId = req.user?.id || req.user?._id;

      const hasAccess = await permissionService.check(
        userId.toString(),
        permission,
        resourceId,
        resourceType
      );

      if (!hasAccess) {
        return next(httpError(403, 'Insufficient permissions'));
      }

      next();
    } catch (error) {
      logger.error('Conditional authorization middleware error:', error);
      next(httpError(500, 'Authorization check failed'));
    }
  };
};
