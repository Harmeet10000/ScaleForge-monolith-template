import { logger } from '../utils/logger.js';
import { catchAsync } from '../utils/catchAsync.js';
import { fgaClient } from '../connections/connectOpenFGA.js';

// Generic method to write relationship tuples
export const writeRelationship = catchAsync(async (tuple) => {
  await fgaClient.write(
    {
      writes: [tuple]
    },
    {
      authorizationModelId: '01K2M2XK88QZ9H6797FM5QYVVZ'
    }
  );
  logger.info(`Relationship written: ${tuple.user} ${tuple.relation} ${tuple.object}`);
  return true;
});

// Generic method to delete relationship tuples
export const deleteRelationship = catchAsync(async (tuple) => {
  await fgaClient.write(
    { deletes: [tuple] },
    {
      authorizationModelId: '01K2M2XK88QZ9H6797FM5QYVVZ'
    }
  );
  logger.info(`Relationship deleted: ${tuple.user} ${tuple.relation} ${tuple.object}`);
  return true;
});

// Generic method to check authorization
export const check = catchAsync(async (tuple) => {
  const response = await fgaClient.check(tuple, {
    authorizationModelId: '01K2M2XK88QZ9H6797FM5QYVVZ'
  });
  return response.allowed;
});

// Batch operations for better performance
export const batchWriteRelationships = catchAsync(async (tuples) => {
  await fgaClient.write({ writes: tuples }, { authorizationModelId: '01K2M2XK88QZ9H6797FM5QYVVZ' });
  logger.info(`Batch relationships written: ${tuples.length} tuples`);
  return true;
});

export const batchDeleteRelationships = catchAsync(async (tuples) => {
  await fgaClient.write(
    { deletes: tuples },
    { authorizationModelId: '01K2M2XK88QZ9H6797FM5QYVVZ' }
  );
  logger.info(`Batch relationships deleted: ${tuples.length} tuples`);
  return true;
});

// List objects a user has access to
export const listObjects = catchAsync(async (user, relation, objectType) => {
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
export const listUsers = catchAsync(async (relation, object, objectType) => {
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
export const readRelationships = catchAsync(
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
