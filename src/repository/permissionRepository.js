import { logger } from '../utils/logger.js';
import { catchAsync } from '../utils/catchAsync.js';

const client = null;

// Define the authorization model schema
// eslint-disable-next-line arrow-body-style
export const getAuthorizationModel = () => {
  return {
    schema_version: '1.1',
    type_definitions: [
      {
        type: 'user',
        relations: {},
        metadata: {
          relations: {}
        }
      },
      {
        type: 'organization',
        relations: {
          owner: {
            this: {}
          },
          admin: {
            this: {}
          },
          member: {
            this: {}
          },
          viewer: {
            union: {
              child: [
                {
                  this: {}
                },
                {
                  computedUserset: {
                    relation: 'member'
                  }
                }
              ]
            }
          }
        },
        metadata: {
          relations: {
            owner: { directly_related_user_types: [{ type: 'user' }] },
            admin: { directly_related_user_types: [{ type: 'user' }] },
            member: { directly_related_user_types: [{ type: 'user' }] },
            viewer: { directly_related_user_types: [{ type: 'user' }] }
          }
        }
      },
      {
        type: 'project',
        relations: {
          owner: {
            this: {}
          },
          editor: {
            this: {}
          },
          viewer: {
            union: {
              child: [
                {
                  this: {}
                },
                {
                  computedUserset: {
                    relation: 'editor'
                  }
                }
              ]
            }
          },
          org_viewer: {
            tupleToUserset: {
              tupleset: {
                relation: 'organization'
              },
              computedUserset: {
                relation: 'viewer'
              }
            }
          },
          organization: {
            this: {}
          }
        },
        metadata: {
          relations: {
            owner: { directly_related_user_types: [{ type: 'user' }] },
            editor: { directly_related_user_types: [{ type: 'user' }] },
            viewer: { directly_related_user_types: [{ type: 'user' }] },
            organization: { directly_related_user_types: [{ type: 'organization' }] }
          }
        }
      },
      {
        type: 'document',
        relations: {
          owner: {
            this: {}
          },
          editor: {
            this: {}
          },
          viewer: {
            union: {
              child: [
                {
                  this: {}
                },
                {
                  computedUserset: {
                    relation: 'editor'
                  }
                }
              ]
            }
          },
          project_viewer: {
            tupleToUserset: {
              tupleset: {
                relation: 'project'
              },
              computedUserset: {
                relation: 'viewer'
              }
            }
          },
          project: {
            this: {}
          }
        },
        metadata: {
          relations: {
            owner: { directly_related_user_types: [{ type: 'user' }] },
            editor: { directly_related_user_types: [{ type: 'user' }] },
            viewer: { directly_related_user_types: [{ type: 'user' }] },
            project: { directly_related_user_types: [{ type: 'project' }] }
          }
        }
      }
    ]
  };
};

// Generic method to write relationship tuples
export const writeRelationship = catchAsync(async (user, relation, object, objectType) => {
  const tuple = {
    user: `user:${user}`,
    relation,
    object: `${objectType}:${object}`
  };
  await client.write({ writes: [tuple] });
  logger.info(`Relationship written: ${tuple.user} ${relation} ${tuple.object}`);
  return true;
});

// Generic method to delete relationship tuples
export const deleteRelationship = catchAsync(async (user, relation, object, objectType) => {
  const tuple = {
    user: `user:${user}`,
    relation,
    object: `${objectType}:${object}`
  };
  await client.write({ deletes: [tuple] });
  logger.info(`Relationship deleted: ${tuple.user} ${relation} ${tuple.object}`);
  return true;
});

// Generic method to check authorization
export const check = catchAsync(async (user, relation, object, objectType) => {
  const response = await client.check({
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
  await client.write({ writes: tuples });
  logger.info(`Batch relationships written: ${tuples.length} tuples`);
  return true;
});

export const batchDeleteRelationships = catchAsync(async (relationships) => {
  const tuples = relationships.map(({ user, relation, object, objectType }) => ({
    user: `user:${user}`,
    relation,
    object: `${objectType}:${object}`
  }));
  await client.write({ deletes: tuples });
  logger.info(`Batch relationships deleted: ${tuples.length} tuples`);
  return true;
});

// List objects a user has access to
export const listObjects = catchAsync(async (user, relation, objectType) => {
  const response = await client.listObjects({
    user: `user:${user}`,
    relation,
    type: objectType
  });
  return response.objects || [];
});

// List users who have access to an object
export const listUsers = catchAsync(async (relation, object, objectType) => {
  const response = await client.listUsers({
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
    const response = await client.read(filter);
    return response.tuples || [];
  }
);
