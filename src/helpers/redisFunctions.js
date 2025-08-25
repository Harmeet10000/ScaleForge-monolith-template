import { logger } from '../utils/logger.js';
import asyncHandler from 'express-async-handler';
import { redisClient } from '../connections/connectRedis.js';

// Use Case | Recommended Redis Type
// Caching a JWT token or simple API response | String
// Caching user profile (id, name, email, phone) | Hash
// Caching a list of recent notifications | List
// Caching online user IDs (unique users) | Set
// Caching leaderboard scores | Sorted Set
// Data Type | When to Use It
// String (SET, GET) | - Most basic and most common.  - Use when caching single values, simple objects (as JSON), tokens, etc.
// Hash (HSET, HGET) | - Cache objects with multiple fields.  - Like a row in a database (e.g., user profile: name, age, email).  - Great for partial reads/updates (e.g., updating only user's email).
// List (LPUSH, LRANGE) | - Cache ordered sequences of items.  - Example: Recent activity feed, chat messages, task queues.
// Set (SADD, SMEMBERS) | - Cache unique unordered items (no duplicates).  - Example: Online users, tags, permissions.
// Sorted Set (ZADD, ZRANGE) | - Cache items with a score (ranking).  - Example: Leaderboards, ranking posts by popularity, trending topics.

const getKeyName = (objectType, ...args) => `${objectType}:${args.join(':')}`;
const getCacheKey = (objectType, key) =>
  getKeyName(objectType, ...(Array.isArray(key) ? key : [key]));

export const setCache = asyncHandler(async (objectType, key, value, expireSeconds = 1800) => {
  const cacheKey = getCacheKey(objectType, key);

  const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;

  await redisClient.set(cacheKey, stringValue, 'EX', expireSeconds);

  logger.info(`Cache set: ${cacheKey}`);
  return true;
});

export const getCache = asyncHandler(async (objectType, key, parseJson = true) => {
  const cacheKey = getCacheKey(objectType, key);

  const result = await redisClient.get(cacheKey);

  if (!result) {
    return null;
  }

  if (parseJson) {
    try {
      return JSON.parse(result);
    } catch (e) {
      logger.error('Error parsing cache JSON', { meta: { cacheKey, error: e } });
      return;
    }
  }

  return result;
});

export const deleteCache = asyncHandler(async (objectType, key) => {
  const cacheKey = getCacheKey(objectType, key);

  const result = await redisClient.del(cacheKey);

  logger.info(`Cache deleted: ${cacheKey}, Result: ${result}`);
  return result > 0;
});

// New utility function to serialize nested objects for Redis hash storage
const serializeHashData = (data) => {
  const serialized = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      // Serialize if value is an object and not null
      serialized[key] = value && typeof value === 'object' ? JSON.stringify(value) : value;
    }
  }
  return serialized;
};

// Redis Hash CRUD Operations

export const setHash = asyncHandler(async (objectType, key, data, expireSeconds = 1800) => {
  const cacheKey = getCacheKey(objectType, key);
  // Serialize nested objects to prevent data loss
  const serializedData = serializeHashData(data);
  // logger.debug(`Setting hash: ${cacheKey}`, { meta: { data } });
  await redisClient.hset(cacheKey, serializedData);
  if (expireSeconds) {
    await redisClient.expire(cacheKey, expireSeconds);
  }
  logger.info(`Hash set: ${cacheKey}`);
  return true;
});

export const getHash = asyncHandler(async (objectType, key) => {
  const cacheKey = getCacheKey(objectType, key);
  // logger.debug(`Getting hash: ${cacheKey}`);
  const result = await redisClient.hgetall(cacheKey);
  // if (!result || Object.keys(result).length === 0) {
  //   return null;
  // }
  // Deserialize each field if it's a JSON string
  // Object.keys(result).forEach((field) => {
  //   try {
  //     result[field] = JSON.parse(result[field]);
  //   } catch (err) {
  //     // Leave as is if parsing fails
  //     logger.error('Error parsing hash field JSON', { meta: { cacheKey, field, error: err } });
  //   }
  // });
  logger.info(`Hash retrieved:`, { meta: result });
  return result;
});

export const updateHash = asyncHandler(async (objectType, key, data) => {
  const cacheKey = getCacheKey(objectType, key);
  const serializedData = serializeHashData(data);
  await redisClient.hset(cacheKey, serializedData);
  logger.info(`Hash updated: ${cacheKey}`);
  return true;
});

export const deleteHashField = asyncHandler(async (objectType, key, field) => {
  const cacheKey = getCacheKey(objectType, key);
  const result = await redisClient.hdel(cacheKey, field);
  logger.info(`Hash field deleted: ${cacheKey}, field: ${field}, Result: ${result}`);
  return result > 0;
});

export const deleteHash = asyncHandler(async (objectType, key) => {
  const cacheKey = getCacheKey(objectType, key);
  const result = await redisClient.del(cacheKey);
  logger.info(`Hash deleted: ${cacheKey}, Result: ${result}`);
  return result > 0;
});

// Redis List CRUD Operations

export const pushToList = asyncHandler(
  async (objectType, key, value, prepend = false, expireSeconds = null) => {
    const cacheKey = getCacheKey(objectType, key);

    // Handle multiple values
    const values = Array.isArray(value) ? value : [value];

    // Stringify objects/arrays, keep primitives as is
    const stringValues = values.map((v) => (typeof v === 'object' ? JSON.stringify(v) : v));

    // Use LPUSH for prepending (add to start), RPUSH for appending (add to end)
    const result = prepend
      ? await redisClient.lpush(cacheKey, ...stringValues)
      : await redisClient.rpush(cacheKey, ...stringValues);

    if (expireSeconds) {
      await redisClient.expire(cacheKey, expireSeconds);
    }

    logger.info(`${prepend ? 'Prepended' : 'Appended'} to list: ${cacheKey}, Count: ${result}`);
    return result;
  }
);

export const getListItems = asyncHandler(
  async (objectType, key, start = 0, end = -1, parseJson = true) => {
    const cacheKey = getCacheKey(objectType, key);
    const items = await redisClient.lrange(cacheKey, start, end);

    if (!items || items.length === 0) {
      return [];
    }

    // Parse JSON strings if requested and possible
    if (parseJson) {
      return items.map((item) => {
        try {
          return JSON.parse(item);
        } catch (e) {
          logger.error('Error parsing list item JSON', { meta: { cacheKey, error: e } });
          return item;
        }
      });
    }

    return items;
  }
);

export const getListLength = asyncHandler(async (objectType, key) => {
  const cacheKey = getCacheKey(objectType, key);
  const length = await redisClient.llen(cacheKey);
  return length;
});

export const removeFromList = asyncHandler(async (objectType, key, value, count = 0) => {
  const cacheKey = getCacheKey(objectType, key);

  const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;

  // count = 0: remove all occurrences
  // count > 0: remove first 'count' occurrences from head to tail
  // count < 0: remove last 'count' occurrences from tail to head
  const result = await redisClient.lrem(cacheKey, count, stringValue);

  logger.info(`Removed from list: ${cacheKey}, Count: ${result}`);
  return result;
});

export const updateListItem = asyncHandler(async (objectType, key, index, newValue) => {
  const cacheKey = getCacheKey(objectType, key);

  // Stringify objects/arrays if needed
  const stringValue = typeof newValue === 'object' ? JSON.stringify(newValue) : newValue;

  await redisClient.lset(cacheKey, index, stringValue);
  logger.info(`Updated list item: ${cacheKey}, Index: ${index}`);
  return true;
});

export const trimList = asyncHandler(async (objectType, key, start, end) => {
  const cacheKey = getCacheKey(objectType, key);
  await redisClient.ltrim(cacheKey, start, end);
  logger.info(`Trimmed list: ${cacheKey}, Range: ${start} to ${end}`);
  return true;
});

export const deleteList = asyncHandler(async (objectType, key) => {
  const cacheKey = getCacheKey(objectType, key);
  const result = await redisClient.del(cacheKey);
  logger.info(`List deleted: ${cacheKey}, Result: ${result}`);
  return result > 0;
});

// Redis Search Functions

export const createSearchIndex = asyncHandler(async (indexName, prefix, schema, options = {}) => {
  // Check if index already exists
  let indexExists = false;

  try {
    await redisClient.call('FT.INFO', indexName);
    // If no error is thrown, index exists
    logger.info(`Search index already exists: ${indexName}`);
    indexExists = true;
  } catch (err) {
    // Index doesn't exist, continue with creation
    if (!err.message.includes('Unknown index name')) {
      throw err; // Re-throw if it's not a "doesn't exist" error
    }
  }

  if (indexExists) {
    return { created: false, indexName };
  }

  // Prepare command arguments
  const args = ['FT.CREATE', indexName];

  // Add prefix if provided
  if (prefix) {
    args.push('ON', 'HASH', 'PREFIX', '1', prefix);
  }

  // Add options if any
  if (options.language) {
    args.push('LANGUAGE', options.language);
  }

  if (options.stopwords && Array.isArray(options.stopwords)) {
    args.push('STOPWORDS', options.stopwords.length.toString(), ...options.stopwords);
  }

  // Add schema definition
  args.push('SCHEMA');
  Object.entries(schema).forEach(([field, def]) => {
    args.push(field, def.type);
    if (def.sortable) {
      args.push('SORTABLE');
    }
    if (def.noindex) {
      args.push('NOINDEX');
    }
    if (def.nostem) {
      args.push('NOSTEM');
    }
    if (def.weight) {
      args.push('WEIGHT', def.weight.toString());
    }
    if (def.separator) {
      args.push('SEPARATOR', def.separator);
    }
  });

  // Execute create command
  await redisClient.call(...args);
  logger.info(`Search index created: ${indexName}`);
  return { created: true, indexName };
});

export const searchIndex = asyncHandler(async (indexName, query, options = {}) => {
  // Prepare base arguments
  const args = ['FT.SEARCH', indexName, query];

  // Add options
  if (options.limit !== undefined) {
    const offset = options.offset || 0;
    args.push('LIMIT', offset.toString(), options.limit.toString());
  }

  if (options.sortBy) {
    args.push('SORTBY', options.sortBy);
    if (options.sortDirection) {
      args.push(options.sortDirection.toUpperCase());
    }
  }

  if (options.returnFields && Array.isArray(options.returnFields)) {
    args.push('RETURN', options.returnFields.length.toString(), ...options.returnFields);
  }

  if (options.highlight) {
    args.push('HIGHLIGHT');
    if (options.highlightFields && Array.isArray(options.highlightFields)) {
      args.push('FIELDS', options.highlightFields.length.toString(), ...options.highlightFields);
    }
    if (
      options.highlightTags &&
      Array.isArray(options.highlightTags) &&
      options.highlightTags.length === 2
    ) {
      args.push('TAGS', options.highlightTags[0], options.highlightTags[1]);
    }
  }

  if (options.summarize) {
    args.push('SUMMARIZE');
    if (options.summarizeFields && Array.isArray(options.summarizeFields)) {
      args.push('FIELDS', options.summarizeFields.length.toString(), ...options.summarizeFields);
    }
    if (options.summarizeFrags) {
      args.push('FRAGS', options.summarizeFrags.toString());
    }
    if (options.summarizeLen) {
      args.push('LEN', options.summarizeLen.toString());
    }
    if (options.summarizeSeparator) {
      args.push('SEPARATOR', options.summarizeSeparator);
    }
  }

  if (options.filters && Array.isArray(options.filters)) {
    options.filters.forEach((filter) => {
      args.push('FILTER', filter.field, filter.min.toString(), filter.max.toString());
    });
  }

  if (options.geoFilter) {
    const { field, lon, lat, radius, unit } = options.geoFilter;
    args.push('GEOFILTER', field, lon.toString(), lat.toString(), radius.toString(), unit);
  }

  // Execute search command
  const result = await redisClient.call(...args);

  // Process search results
  const totalResults = result[0];
  const formattedResults = [];

  // Redis returns [totalCount, docId1, [field1, value1, field2, value2...], docId2, ...]
  for (let i = 1; i < result.length; i += 2) {
    const docId = result[i];
    const fields = result[i + 1];

    const doc = { id: docId };
    for (let j = 0; j < fields.length; j += 2) {
      doc[fields[j]] = fields[j + 1];
    }

    formattedResults.push(doc);
  }

  return { totalResults, documents: formattedResults };
});

export const deleteSearchIndex = asyncHandler(async (indexName) => {
  await redisClient.call('FT.DROPINDEX', indexName);
  logger.info(`Search index deleted: ${indexName}`);
  return { deleted: true, indexName };
});

// Redis Bloom Filter Functions

export const createBloomFilter = asyncHandler(async (filterName, errorRate, capacity) => {
  // Check if filter already exists
  let filterExists = false;

  try {
    await redisClient.call('BF.INFO', filterName);
    logger.info(`Bloom filter already exists: ${filterName}`);
    filterExists = true;
  } catch (err) {
    // Filter doesn't exist, continue with creation
    if (!err.message.includes('not found')) {
      throw err; // Re-throw if it's not a "doesn't exist" error
    }
  }

  if (filterExists) {
    return { created: false, filterName };
  }

  await redisClient.call('BF.RESERVE', filterName, errorRate.toString(), capacity.toString());
  logger.info(
    `Bloom filter created: ${filterName}, error rate: ${errorRate}, capacity: ${capacity}`
  );
  return { created: true, filterName };
});

export const addToBloomFilter = asyncHandler(async (filterName, value) => {
  if (Array.isArray(value)) {
    // Multi-add for arrays
    const args = ['BF.MADD', filterName, ...value];
    const results = await redisClient.call(...args);
    logger.info(`Added multiple items to bloom filter: ${filterName}`);
    return results.map((r) => r === 1);
  }

  // Single value add
  const result = await redisClient.call('BF.ADD', filterName, value);
  return result === 1; // Returns true if item was added, false if it already existed
});

export const checkBloomFilter = asyncHandler(async (filterName, value) => {
  try {
    if (Array.isArray(value)) {
      // Multi-check for arrays
      const args = ['BF.MEXISTS', filterName, ...value];
      const results = await redisClient.call(...args);
      logger.info(`Checked multiple items in bloom filter: ${filterName}`);
      return results.map((result) => result === 1);
    } else {
      // Single value check
      const result = await redisClient.call('BF.EXISTS', filterName, value);
      logger.info(`Checked bloom filter: ${filterName}, value: ${value}, exists: ${result === 1}`);
      return result === 1; // Returns true if item might exist, false if definitely does not exist
    }
  } catch (err) {
    logger.error(`Failed to check bloom filter: ${filterName}`, { meta: err });
    throw err;
  }
});

export const getBloomFilterInfo = asyncHandler(async (filterName) => {
  try {
    const info = await redisClient.call('BF.INFO', filterName);

    // Process the info response into a more usable format
    const infoObject = {};
    for (let i = 0; i < info.length; i += 2) {
      infoObject[info[i]] = info[i + 1];
    }

    logger.info(`Retrieved bloom filter info: ${filterName}`);
    return infoObject;
  } catch (err) {
    logger.error(`Failed to get bloom filter info: ${filterName}`, { meta: err });
    throw err;
  }
});
