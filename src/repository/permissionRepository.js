import { logger } from '../utils/logger.js';
import { catchAsync } from '../utils/catchAsync.js';
import { fgaClient } from '../connections/connectOpenFGA.js';

// Generic method to write relationship tuples
export const writeRelationship = catchAsync(
  async (user, relation, object, objectType = 'organization') => {
    const tuple = {
      user: `user:${user}`,
      relation,
      object: `${objectType}:${object}`
    };
    await fgaClient.write({ writes: { tuple_keys: [tuple] } });

    logger.info(`Relationship written: ${tuple.user} ${relation} ${tuple.object}`);
    return true;
  }
);

// Generic method to delete relationship tuples
export const deleteRelationship = catchAsync(async (user, relation, object, objectType) => {
  const tuple = {
    user: `user:${user}`,
    relation,
    object: `${objectType}:${object}`
  };
  await fgaClient.write({ deletes: [tuple] });
  logger.info(`Relationship deleted: ${tuple.user} ${relation} ${tuple.object}`);
  return true;
});

// Generic method to check authorization
export const check = catchAsync(async (user, relation, object, objectType) => {
  const response = await fgaClient.check({
    tuple_key: {
      user: `user:${user}`,
      relation,
      object: `${objectType}:${object}`
    }
  });
  return response.allowed;
});

// Batch operations for better performance
export const batchWriteRelationships = catchAsync(async (relationships) => {
  const tuples = relationships.map(({ user, relation, object, objectType }) => ({
    user: `user:${user}`,
    relation,
    object: `${objectType}:${object}`
  }));
  await fgaClient.write({ writes: { tuple_keys: tuples } });
  logger.info(`Batch relationships written: ${tuples.length} tuples`);
  return true;
});

export const batchDeleteRelationships = catchAsync(async (relationships) => {
  const tuples = relationships.map(({ user, relation, object, objectType }) => ({
    user: `user:${user}`,
    relation,
    object: `${objectType}:${object}`
  }));
  await fgaClient.write({ deletes: tuples });
  logger.info(`Batch relationships deleted: ${tuples.length} tuples`);
  return true;
});

// List objects a user has access to
export const listObjects = catchAsync(async (user, relation, objectType) => {
  const response = await fgaClient.listObjects({
    user: `user:${user}`,
    relation,
    type: objectType
  });
  return response.objects || [];
});

// List users who have access to an object
export const listUsers = catchAsync(async (relation, object, objectType) => {
  const response = await fgaClient.listUsers({
    object: {
      type: objectType,
      id: object
    },
    relation,
    user_filters: [{ type: 'user' }]
  });
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
