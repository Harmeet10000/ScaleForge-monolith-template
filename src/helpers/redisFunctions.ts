import { logger } from '../utils/logger';
import { redisClient } from '../db/connectRedis';

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

export const getKeyName = (objectType: string, ...args: Array<string | number>): string =>
  `${objectType}:${args.join(':')}`;
export const getCacheKey = (objectType: string, key: string | Array<string | number>): string =>
  Array.isArray(key) ? getKeyName(objectType, ...key) : key;
// User key helper functions
export const UserKeyById = (id: string): string => getKeyName('user', 'id', id);
export const UserKeyByEmail = (email: string): string => getKeyName('user', 'email', email);
export const UserKeyByUsername = (username: string): string =>
  getKeyName('user', 'username', username);
export const UserKeyByToken = (token: string): string => getKeyName('user', 'token', token);

export const setCache = async (
  objectType: string,
  key: string | Array<string | number>,
  value: any,
  expireSeconds: number | null = null
): Promise<boolean> => {
  const cacheKey = getCacheKey(objectType, key);

  const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;

  if (expireSeconds) {
    await redisClient.set(cacheKey, stringValue, 'EX', expireSeconds);
  } else {
    await redisClient.set(cacheKey, stringValue);
  }

  logger.debug(`Cache set: ${cacheKey}`);
  return true;
};

export const getCache = async (
  objectType: string,
  key: string | Array<string | number>,
  parseJson = true
): Promise<any | null> => {
  const cacheKey = getCacheKey(objectType, key);

  const result = await redisClient.get(cacheKey);

  if (!result) {
    return null;
  }

  if (parseJson) {
    try {
      return JSON.parse(result);
    } catch (e) {
      return result;
    }
  }

  return result;
};

export const deleteCache = async (
  objectType: string,
  key: string | Array<string | number>
): Promise<boolean> => {
  const cacheKey = getCacheKey(objectType, key);

  const result = await redisClient.del(cacheKey);

  logger.debug(`Cache deleted: ${cacheKey}, Result: ${result}`);
  return result > 0;
};

// Redis Hash CRUD Operations

export const setHash = async (
  objectType: string,
  key: string | Array<string | number>,
  data: Record<string, any>,
  expireSeconds: number | null = null
): Promise<boolean> => {
  const cacheKey = getCacheKey(objectType, key);
  await redisClient.hset(cacheKey, data);
  if (expireSeconds) {
    await redisClient.expire(cacheKey, expireSeconds);
  }
  logger.debug(`Hash set: ${cacheKey}`);
  return true;
};

export const getHash = async (
  objectType: string,
  key: string | Array<string | number>
): Promise<Record<string, any> | null> => {
  const cacheKey = getCacheKey(objectType, key);
  const result = await redisClient.hgetall(cacheKey);
  if (!result || Object.keys(result).length === 0) {
    return null;
  }
  return result;
};

export const updateHash = async (
  objectType: string,
  key: string | Array<string | number>,
  data: Record<string, any>
): Promise<boolean> => {
  const cacheKey = getCacheKey(objectType, key);
  await redisClient.hset(cacheKey, data);
  logger.debug(`Hash updated: ${cacheKey}`);
  return true;
};

export const deleteHashField = async (
  objectType: string,
  key: string | Array<string | number>,
  field: string
): Promise<boolean> => {
  const cacheKey = getCacheKey(objectType, key);
  const result = await redisClient.hdel(cacheKey, field);
  logger.debug(`Hash field deleted: ${cacheKey}, field: ${field}, Result: ${result}`);
  return result > 0;
};

export const deleteHash = async (
  objectType: string,
  key: string | Array<string | number>
): Promise<boolean> => {
  const cacheKey = getCacheKey(objectType, key);
  const result = await redisClient.del(cacheKey);
  logger.debug(`Hash deleted: ${cacheKey}, Result: ${result}`);
  return result > 0;
};

// Redis List CRUD Operations

export const pushToList = async (
  objectType: string,
  key: string | Array<string | number>,
  value: any | any[],
  prepend = false,
  expireSeconds: number | null = null
): Promise<number> => {
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

  logger.debug(`${prepend ? 'Prepended' : 'Appended'} to list: ${cacheKey}, Count: ${result}`);
  return result;
};

export const getListItems = async (
  objectType: string,
  key: string | Array<string | number>,
  start = 0,
  end = -1,
  parseJson = true
): Promise<any[]> => {
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
        return item;
      }
    });
  }

  return items;
};

export const getListLength = async (
  objectType: string,
  key: string | Array<string | number>
): Promise<number> => {
  const cacheKey = getCacheKey(objectType, key);
  const length = await redisClient.llen(cacheKey);
  return length;
};

export const removeFromList = async (
  objectType: string,
  key: string | Array<string | number>,
  value: any,
  count = 0
): Promise<number> => {
  const cacheKey = getCacheKey(objectType, key);

  const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;

  // count = 0: remove all occurrences
  // count > 0: remove first 'count' occurrences from head to tail
  // count < 0: remove last 'count' occurrences from tail to head
  const result = await redisClient.lrem(cacheKey, count, stringValue);

  logger.debug(`Removed from list: ${cacheKey}, Count: ${result}`);
  return result;
};

export const updateListItem = async (
  objectType: string,
  key: string | Array<string | number>,
  index: number,
  newValue: any
): Promise<boolean> => {
  const cacheKey = getCacheKey(objectType, key);

  // Stringify objects/arrays if needed
  const stringValue = typeof newValue === 'object' ? JSON.stringify(newValue) : newValue;

  await redisClient.lset(cacheKey, index, stringValue);
  logger.debug(`Updated list item: ${cacheKey}, Index: ${index}`);
  return true;
};

export const trimList = async (
  objectType: string,
  key: string | Array<string | number>,
  start: number,
  end: number
): Promise<boolean> => {
  const cacheKey = getCacheKey(objectType, key);
  await redisClient.ltrim(cacheKey, start, end);
  logger.debug(`Trimmed list: ${cacheKey}, Range: ${start} to ${end}`);
  return true;
};

export const deleteList = async (
  objectType: string,
  key: string | Array<string | number>
): Promise<boolean> => {
  const cacheKey = getCacheKey(objectType, key);
  const result = await redisClient.del(cacheKey);
  logger.debug(`List deleted: ${cacheKey}, Result: ${result}`);
  return result > 0;
};

// Redis Search Functions

export const createSearchIndex = async (
  indexName: string,
  prefix: string,
  schema: Record<string, any>,
  options: Record<string, any> = {}
): Promise<{ created: boolean; indexName: string }> => {
  // Check if index already exists
  let indexExists = false;

  try {
    await redisClient.call('FT.INFO', indexName);
    // If no error is thrown, index exists
    logger.debug(`Search index already exists: ${indexName}`);
    indexExists = true;
  } catch (err: unknown) {
    // Index doesn't exist, continue with creation
    const error = err as Error;
    if (!error.message || !error.message.includes('Unknown index name')) {
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
  await redisClient.call(...(args as [string, ...string[]]));
  logger.debug(`Search index created: ${indexName}`);
  return { created: true, indexName };
};

export const searchIndex = async (
  indexName: string,
  query: string,
  options: Record<string, any> = {}
): Promise<{ totalResults: number; documents: any[] }> => {
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
  const result = (await redisClient.call(...(args as [string, ...string[]]))) as Array<any>;

  // Process search results
  const totalResults = result[0] as number;
  const formattedResults = [];

  // Redis returns [totalCount, docId1, [field1, value1, field2, value2...], docId2, ...]
  for (let i = 1; i < result.length; i += 2) {
    const docId = result[i];
    const fields = result[i + 1] as Array<any>;

    const doc: Record<string, any> = { id: docId };
    for (let j = 0; j < fields.length; j += 2) {
      doc[fields[j]] = fields[j + 1];
    }

    formattedResults.push(doc);
  }

  return { totalResults, documents: formattedResults };
};

export const deleteSearchIndex = async (
  indexName: string
): Promise<{ deleted: boolean; indexName: string }> => {
  await redisClient.call('FT.DROPINDEX', indexName);
  logger.debug(`Search index deleted: ${indexName}`);
  return { deleted: true, indexName };
};

// Redis Bloom Filter Functions

export const createBloomFilter = async (
  filterName: string,
  errorRate: number,
  capacity: number
): Promise<{ created: boolean; filterName: string }> => {
  // Check if filter already exists
  let filterExists = false;

  try {
    await redisClient.call('BF.INFO', filterName);
    logger.debug(`Bloom filter already exists: ${filterName}`);
    filterExists = true;
  } catch (err: unknown) {
    // Filter doesn't exist, continue with creation
    const error = err as Error;
    if (!error.message || !error.message.includes('not found')) {
      throw err; // Re-throw if it's not a "doesn't exist" error
    }
  }

  if (filterExists) {
    return { created: false, filterName };
  }

  await redisClient.call('BF.RESERVE', filterName, errorRate.toString(), capacity.toString());
  logger.debug(
    `Bloom filter created: ${filterName}, error rate: ${errorRate}, capacity: ${capacity}`
  );
  return { created: true, filterName };
};

export const addToBloomFilter = async (
  filterName: string,
  value: string | string[]
): Promise<boolean | boolean[]> => {
  if (Array.isArray(value)) {
    // Multi-add for arrays
    const args = ['BF.MADD', filterName, ...value];
    const results = (await redisClient.call(...(args as [string, ...string[]]))) as Array<number>;
    logger.debug(`Added multiple items to bloom filter: ${filterName}`);
    return results.map((r: number) => r === 1);
  }

  // Single value add
  const result = (await redisClient.call('BF.ADD', filterName, value)) as number;
  return result === 1; // Returns true if item was added, false if it already existed
};

export const checkBloomFilter = async (
  filterName: string,
  value: string | string[]
): Promise<boolean | boolean[]> => {
  try {
    if (Array.isArray(value)) {
      // Multi-check for arrays
      const args = ['BF.MEXISTS', filterName, ...value];
      const results = (await redisClient.call(...(args as [string, ...string[]]))) as Array<number>;
      logger.debug(`Checked multiple items in bloom filter: ${filterName}`);
      return results.map((result: number) => result === 1);
    } else {
      // Single value check
      const result = (await redisClient.call('BF.EXISTS', filterName, value)) as number;
      logger.debug(`Checked bloom filter: ${filterName}, value: ${value}, exists: ${result === 1}`);
      return result === 1; // Returns true if item might exist, false if definitely does not exist
    }
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to check bloom filter: ${filterName}`, { meta: error });
    throw error;
  }
};

export const getBloomFilterInfo = async (filterName: string): Promise<Record<string, any>> => {
  try {
    const info = (await redisClient.call('BF.INFO', filterName)) as Array<string>;

    // Process the info response into a more usable format
    const infoObject: Record<string, string> = {};
    for (let i = 0; i < info.length; i += 2) {
      infoObject[info[i]] = info[i + 1];
    }

    logger.debug(`Retrieved bloom filter info: ${filterName}`);
    return infoObject;
  } catch (err: unknown) {
    const error = err as Error;
    logger.error(`Failed to get bloom filter info: ${filterName}`, { meta: error });
    throw error;
  }
};
