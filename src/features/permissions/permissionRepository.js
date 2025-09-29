import asyncHandler from 'express-async-handler';
import { fgaClient } from '../../connections/connectOpenFGA.js';

// Generic method to write relationship tuples
export const writeRelationship = asyncHandler(async (tuple) => {
  await fgaClient.write(
    {
      writes: [tuple]
    },
    {
      authorizationModelId: '01K2M2XK88QZ9H6797FM5QYVVZ'
    }
  );
  return true;
});

// Generic method to delete relationship tuples
export const deleteRelationship = asyncHandler(async (tuple) => {
  await fgaClient.write(
    { deletes: [tuple] },
    {
      authorizationModelId: '01K2M2XK88QZ9H6797FM5QYVVZ'
    }
  );
  return true;
});

// Generic method to check authorization
export const check = asyncHandler(async (tuple) => {
  const response = await fgaClient.check(tuple, {
    authorizationModelId: '01K2M2XK88QZ9H6797FM5QYVVZ'
  });
  return response.allowed;
});

// Batch operations for better performance
export const batchWriteRelationships = asyncHandler(async (tuples) => {
  await fgaClient.write({ writes: tuples }, { authorizationModelId: '01K2M2XK88QZ9H6797FM5QYVVZ' });
  return true;
});

export const batchDeleteRelationships = asyncHandler(async (tuples) => {
  await fgaClient.write(
    { deletes: tuples },
    { authorizationModelId: '01K2M2XK88QZ9H6797FM5QYVVZ' }
  );
  return true;
});

// List objects a user has access to
export const listObjects = asyncHandler(async (user, relation, objectType) => {
  const response = await fgaClient.listObjects(
    {
      user: `user:${user}`,
      relation,
      type: objectType
    },
    {
      authorizationModelId: '01K2M2XK88QZ9H6797FM5QYVVZ'
    }
  );
  return response.objects || [];
});

// List users who have access to an object
export const listUsers = asyncHandler(async (relation, object, objectType) => {
  const response = await fgaClient.listUsers(
    {
      object: {
        type: objectType,
        id: object
      },
      relation,
      user_filters: [{ type: 'user' }]
    },
    {
      authorizationModelId: '01K2M2XK88QZ9H6797FM5QYVVZ'
    }
  );
  return response.users || [];
});

// Read all relationships for debugging
export const readRelationships = asyncHandler(
  async (user = null, relation = null, object = null, objectType = null) => {
    const filter = {};
    if (user) {
      filter.user = `user:${user}`;
    }
    if (relation) {
      filter.relation = relation;
    }
    if (object && objectType) {
      filter.object = `${objectType}:${object}`;
    }
    const response = await fgaClient.read(filter);
    return response.tuples || [];
  }
);
