# 🔐 OpenFGA Integration Guide

This document provides a comprehensive guide to the OpenFGA (Open Fine-Grained Authorization) integration in the authentication service.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Setup](#setup)
- [Authorization Model](#authorization-model)
- [API Endpoints](#api-endpoints)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

OpenFGA provides fine-grained authorization capabilities that go beyond traditional role-based access control (RBAC). It supports:

- **Relationship-based Authorization**: Define complex relationships between users and resources
- **Hierarchical Permissions**: Inherit permissions through organizational structures
- **Scalable Performance**: Handle millions of authorization checks efficiently
- **Flexible Modeling**: Support various authorization patterns (RBAC, ABAC, ReBAC)

## 🏗️ Architecture

### Authorization Model Structure

```
User
├── Organization (owner, admin, member, viewer)
│   └── Project (owner, editor, viewer)
│       └── Document (owner, editor, viewer)
```

### Key Components

1. **OpenFGA Service** (`src/services/openFGAService.js`)
   - Low-level OpenFGA operations
   - Authorization model management
   - Batch operations for performance

2. **Policy Manager** (`src/services/policyManager.js`)
   - High-level business logic
   - Common authorization patterns
   - DRY principle implementation

3. **Authorization Middleware** (`src/middlewares/authorizationMiddleware.js`)
   - Express middleware for route protection
   - Multiple authorization strategies
   - Integration with existing auth system

4. **Authorization Controller** (`src/controllers/authorizationController.js`)
   - REST API endpoints
   - CRUD operations for permissions
   - Bulk operations support

## 🚀 Setup

### 1. Docker Compose Configuration

The OpenFGA service is already configured in `docker-compose.yml`:

```yaml
openfga:
  image: openfga/openfga:latest
  ports:
    - '8080:8080'  # HTTP API
    - '8081:8081'  # gRPC API
    - '3000:3000'  # Playground UI
  environment:
    - OPENFGA_DATASTORE_ENGINE=postgres
    - OPENFGA_PLAYGROUND_ENABLED=true
```

### 2. Environment Variables

Add to your `.env.dev` file:

```env
# OpenFGA Configuration
OPENFGA_API_URL=http://localhost:8080
OPENFGA_STORE_ID=
OPENFGA_STORE_NAME=auth-service-store
OPENFGA_MODEL_ID=
```

### 3. Install Dependencies

```bash
npm install @openfga/sdk
```

### 4. Start Services

```bash
docker-compose up -d
npm run dev
```

## 📊 Authorization Model

### Type Definitions

#### User
Basic user entity with no relations.

#### Organization
```yaml
relations:
  owner: [user]           # Can do everything
  admin: [user]           # Can manage members
  member: [user]          # Can view and participate
  viewer: [user, member]  # Can only view (inherited from member)
```

#### Project
```yaml
relations:
  owner: [user]                    # Project owner
  editor: [user]                   # Can edit project
  viewer: [user, editor]           # Can view (inherited from editor)
  organization: [organization]     # Linked organization
  org_viewer: [organization#viewer] # Inherit from org viewers
```

#### Document
```yaml
relations:
  owner: [user]                  # Document owner
  editor: [user]                 # Can edit document
  viewer: [user, editor]         # Can view (inherited from editor)
  project: [project]             # Linked project
  project_viewer: [project#viewer] # Inherit from project viewers
```

## 🛠️ API Endpoints

### Organization Management

```http
# Add user to organization
POST /api/v1/authorization/organizations/{organizationId}/users
{
  "userId": "user123",
  "role": "member"
}

# Remove user from organization
DELETE /api/v1/authorization/organizations/{organizationId}/users
{
  "userId": "user123",
  "role": "member"
}

# Get organization users
GET /api/v1/authorization/organizations/{organizationId}/users?role=member

# Get user organizations
GET /api/v1/authorization/users/{userId}/organizations?permission=viewer

# Bulk operations
POST /api/v1/authorization/organizations/{organizationId}/users/bulk
{
  "userIds": ["user1", "user2", "user3"],
  "role": "member"
}
```

### Project Management

```http
# Create project
POST /api/v1/authorization/projects
{
  "projectId": "project123",
  "organizationId": "org456"
}

# Add user to project
POST /api/v1/authorization/projects/{projectId}/users
{
  "userId": "user123",
  "role": "editor"
}

# Get project users
GET /api/v1/authorization/projects/{projectId}/users?role=viewer

# Get user projects
GET /api/v1/authorization/users/{userId}/projects?permission=editor
```

### Document Management

```http
# Create document
POST /api/v1/authorization/documents
{
  "documentId": "doc123",
  "projectId": "project456"
}

# Share document
POST /api/v1/authorization/documents/{documentId}/share
{
  "userId": "user123",
  "role": "viewer"
}

# Get document users
GET /api/v1/authorization/documents/{documentId}/users?role=editor
```

### Advanced Operations

```http
# Transfer ownership
POST /api/v1/authorization/projects/{resourceId}/transfer-ownership
{
  "toUserId": "user456"
}

# Check access
POST /api/v1/authorization/check-access
{
  "userId": "user123",
  "resourceId": "project456",
  "resourceType": "project",
  "permission": "editor"
}

# Get user permissions
GET /api/v1/authorization/users/{userId}/permissions

# Get resource permissions
GET /api/v1/authorization/resources/{resourceType}/{resourceId}/permissions
```

## 💡 Usage Examples

### Basic Authorization Middleware

```javascript
import { authorize, authorizeProject } from '../middlewares/authorizationMiddleware.js';

// Protect route with specific permission
app.get('/projects/:projectId', 
  authMiddleware,
  authorizeProject('viewer'),
  getProject
);

// Require ownership
app.delete('/projects/:projectId',
  authMiddleware,
  authorizeProject('owner'),
  deleteProject
);
```

### Policy Manager Usage

```javascript
import { policyManager } from '../services/policyManager.js';

// Add user to organization
await policyManager.addUserToOrganization('user123', 'org456', 'member');

// Check access
const canEdit = await policyManager.checkProjectAccess('user123', 'project789', 'editor');

// Get user permissions
const permissions = await policyManager.getUserPermissions('user123');
```

### Custom Authorization Logic

```javascript
import { openFGAService } from '../services/openFGAService.js';

// Custom relationship
await openFGAService.writeRelationship('user123', 'reviewer', 'document456', 'document');

// Batch operations
await openFGAService.batchWriteRelationships([
  { user: 'user1', relation: 'member', object: 'org1', objectType: 'organization' },
  { user: 'user2', relation: 'member', object: 'org1', objectType: 'organization' }
]);
```

## 🎯 Best Practices

### 1. Use High-Level APIs

Prefer `policyManager` over direct `openFGAService` calls:

```javascript
// ✅ Good
await policyManager.addUserToOrganization(userId, orgId, 'member');

// ❌ Avoid
await openFGAService.writeRelationship(userId, 'member', orgId, 'organization');
```

### 2. Batch Operations

Use batch operations for better performance:

```javascript
// ✅ Good - Single API call
await policyManager.bulkAddUsersToOrganization(userIds, orgId, 'member');

// ❌ Avoid - Multiple API calls
for (const userId of userIds) {
  await policyManager.addUserToOrganization(userId, orgId, 'member');
}
```

### 3. Middleware Usage

Use appropriate middleware for route protection:

```javascript
// ✅ Good - Specific middleware
app.get('/projects/:projectId', authorizeProject('viewer'), handler);

// ✅ Good - Generic middleware
app.get('/resources/:resourceType/:id', authorize('project', 'viewer'), handler);
```

### 4. Error Handling

Always handle authorization errors gracefully:

```javascript
try {
  const hasAccess = await policyManager.checkProjectAccess(userId, projectId, 'editor');
  if (!hasAccess) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
} catch (error) {
  logger.error('Authorization check failed:', error);
  return res.status(500).json({ error: 'Authorization service unavailable' });
}
```

### 5. Resource Cleanup

Clean up permissions when resources are deleted:

```javascript
// When deleting a project
await policyManager.removeAllResourcePermissions(projectId, 'project');
```

## 🔧 Troubleshooting

### Common Issues

#### 1. OpenFGA Service Not Starting

```bash
# Check if PostgreSQL is running
docker-compose logs postgres

# Check OpenFGA logs
docker-compose logs openfga

# Restart services
docker-compose restart openfga postgres
```

#### 2. Authorization Model Not Found

```javascript
// Reinitialize the authorization model
await openFGAService.setupAuthorizationModel();
```

#### 3. Store ID Not Set

```bash
# Check environment variables
echo $OPENFGA_STORE_ID

# Create new store if needed
curl -X POST http://localhost:8080/stores \
  -H "Content-Type: application/json" \
  -d '{"name": "auth-service-store"}'
```

#### 4. Permission Denied Errors

```javascript
// Debug user permissions
const permissions = await policyManager.getUserPermissions(userId);
console.log('User permissions:', permissions);

// Debug resource permissions
const resourcePerms = await policyManager.getResourcePermissions(resourceId, resourceType);
console.log('Resource permissions:', resourcePerms);
```

### Debugging Tools

#### 1. OpenFGA Playground

Access the playground at `http://localhost:3000` to:
- Visualize authorization model
- Test authorization queries
- Debug relationships

#### 2. API Endpoints for Debugging

```http
# List all relationships for a user
GET /api/v1/authorization/users/{userId}/permissions

# Check specific access
POST /api/v1/authorization/check-access
{
  "userId": "user123",
  "resourceId": "project456",
  "resourceType": "project",
  "permission": "viewer"
}
```

#### 3. Logging

Enable debug logging in your `.env.dev`:

```env
LOG_LEVEL=debug
```

## 📚 Additional Resources

- [OpenFGA Documentation](https://openfga.dev/docs)
- [OpenFGA Playground](https://play.fga.dev/)
- [Authorization Model Examples](https://openfga.dev/docs/modeling)
- [Performance Best Practices](https://openfga.dev/docs/interacting/relationship-queries#performance)

## 🤝 Contributing

When adding new authorization features:

1. Update the authorization model if needed
2. Add corresponding API endpoints
3. Create middleware for common patterns
4. Add validation schemas
5. Update documentation and examples
6. Add tests for new functionality

---

For more information, see the main [README.md](../README.md) or check the [examples](../src/examples/openFGAExamples.js).