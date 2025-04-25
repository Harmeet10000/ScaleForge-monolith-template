import { redisClient } from './redisClient.js';
import { logger } from '../utils/logger.js';
import { catchAsync } from '../utils/catchAsync.js';

export const getKeyName = (objectType, ...args) => `${objectType}:${args.join(':')}`;

// User key helper functions
export const UserKeyById = (id) => getKeyName('user', 'id', id);
export const UserKeyByEmail = (email) => getKeyName('user', 'email', email);
export const UserKeyByUsername = (username) => getKeyName('user', 'username', username);
export const UserKeyByToken = (token) => getKeyName('user', 'token', token);

export const setCache = catchAsync(async (objectType, key, value, expireSeconds = null) => {
  // Handle both key as string and key parts as array
  const cacheKey = Array.isArray(key) ? getKeyName(objectType, ...key) : key;

  // Stringify objects/arrays, keep primitives as is
  const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;

  if (expireSeconds) {
    await redisClient.set(cacheKey, stringValue, 'EX', expireSeconds);
  } else {
    await redisClient.set(cacheKey, stringValue);
  }

  logger.debug(`Cache set: ${cacheKey}`);
  return true;
});

export const getCache = catchAsync(async (objectType, key, parseJson = true) => {
  // Handle both key as string and key parts as array
  const cacheKey = Array.isArray(key) ? getKeyName(objectType, ...key) : key;

  const result = await redisClient.get(cacheKey);

  if (!result) {
    return null;
  }

  // Parse JSON strings if requested and possible
  if (parseJson) {
    try {
      return JSON.parse(result);
    } catch (e) {
      // If parsing fails, return the raw string
      return result;
    }
  }

  return result;
});

export const deleteCache = catchAsync(async (objectType, key) => {
  // Handle both key as string and key parts as array
  const cacheKey = Array.isArray(key) ? getKeyName(objectType, ...key) : key;

  const result = await redisClient.del(cacheKey);

  logger.debug(`Cache deleted: ${cacheKey}, Result: ${result}`);
  return result > 0; // Returns true if at least one key was deleted
});
