import { connectOFGA } from '../connections/connectOpenFGA.js';
import { logger } from '../utils/logger.js';

let client = null;
let authorizationModelId = null;

export const initialize = async () => {
  client = await connectOFGA();
  await setupAuthorizationModel();
};

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

export const setupAuthorizationModel = async () => {
  try {
    const model = getAuthorizationModel();
    const response = await client.writeAuthorizationModel(model);
    authorizationModelId = response.authorization_model_id;
    logger.info(`Authorization model created: ${authorizationModelId}`);
    return authorizationModelId;
  } catch (error) {
    logger.error('Failed to setup authorization model:', error);
    throw error;
  }
};

// Generic method to write relationship tuples
export const writeRelationship = async (user, relation, object, objectType) => {
  try {
    const tuple = {
      user: `user:${user}`,
      relation,
      object: `${objectType}:${object}`
    };

    await client.write({
      writes: [tuple]
    });

    logger.info(`Relationship written: ${tuple.user} ${relation} ${tuple.object}`);
    return true;
  } catch (error) {
    logger.error('Failed to write relationship:', error);
    throw error;
  }
};

// Generic method to delete relationship tuples
export const deleteRelationship = async (user, relation, object, objectType) => {
  try {
    const tuple = {
      user: `user:${user}`,
      relation,
      object: `${objectType}:${object}`
    };

    await client.write({
      deletes: [tuple]
    });

    logger.info(`Relationship deleted: ${tuple.user} ${relation} ${tuple.object}`);
    return true;
  } catch (error) {
    logger.error('Failed to delete relationship:', error);
    throw error;
  }
};

// Generic method to check authorization
export const check = async (user, relation, object, objectType) => {
  try {
    const response = await client.check({
      tuple_key: {
        user: `user:${user}`,
        relation,
        object: `${objectType}:${object}`
      }
    });

    return response.allowed;
  } catch (error) {
    logger.error('Failed to check authorization:', error);
    throw error;
  }
};

// Batch operations for better performance
export const batchWriteRelationships = async (relationships) => {
  try {
    const tuples = relationships.map(({ user, relation, object, objectType }) => ({
      user: `user:${user}`,
      relation,
      object: `${objectType}:${object}`
    }));

    await client.write({
      writes: tuples
    });

    logger.info(`Batch relationships written: ${tuples.length} tuples`);
    return true;
  } catch (error) {
    logger.error('Failed to batch write relationships:', error);
    throw error;
  }
};

export const batchDeleteRelationships = async (relationships) => {
  try {
    const tuples = relationships.map(({ user, relation, object, objectType }) => ({
      user: `user:${user}`,
      relation,
      object: `${objectType}:${object}`
    }));

    await client.write({
      deletes: tuples
    });

    logger.info(`Batch relationships deleted: ${tuples.length} tuples`);
    return true;
  } catch (error) {
    logger.error('Failed to batch delete relationships:', error);
    throw error;
  }
};

// List objects a user has access to
export const listObjects = async (user, relation, objectType) => {
  try {
    const response = await client.listObjects({
      user: `user:${user}`,
      relation,
      type: objectType
    });

    return response.objects || [];
  } catch (error) {
    logger.error('Failed to list objects:', error);
    throw error;
  }
};

// List users who have access to an object
export const listUsers = async (relation, object, objectType) => {
  try {
    const response = await client.listUsers({
      object: {
        type: objectType,
        id: object
      },
      relation,
      user_filters: [{ type: 'user' }]
    });

    return response.users || [];
  } catch (error) {
    logger.error('Failed to list users:', error);
    throw error;
  }
};

// Read all relationships for debugging
export const readRelationships = async (
  user = null,
  relation = null,
  object = null,
  objectType = null
) => {
  try {
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
  } catch (error) {
    logger.error('Failed to read relationships:', error);
    throw error;
  }
};

// Backward compatibility object
export const openFGAService = {
  initialize,
  getAuthorizationModel,
  setupAuthorizationModel,
  writeRelationship,
  deleteRelationship,
  check,
  batchWriteRelationships,
  batchDeleteRelationships,
  listObjects,
  listUsers,
  readRelationships
};
