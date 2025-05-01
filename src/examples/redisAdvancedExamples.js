import { catchAsync } from '../utils/catchAsync.js';
import { logger } from '../utils/logger.js';
import {
  createSearchIndex,
  searchIndex,
  deleteSearchIndex,
  createBloomFilter,
  addToBloomFilter,
  checkBloomFilter,
  getBloomFilterInfo
} from '../helpers/redisFunctions.js';

/**
 * Example: Using Redis Search for a User Directory
 *
 * This demonstrates creating a full-text search index on user data,
 * allowing for advanced search capabilities like partial matching,
 * filtering by fields, and more.
 */
export const setupUserSearchIndex = catchAsync(async () => {
  // Define the index schema
  const userSchema = {
    name: { type: 'TEXT', weight: 1.0, sortable: true },
    emailAddress: { type: 'TAG', sortable: true },
    role: { type: 'TAG' },
    timezone: { type: 'TEXT' },
    lastLoginAt: { type: 'NUMERIC', sortable: true },
    consent: { type: 'TAG' }
  };

  // Create the search index with prefix for user hashes
  const result = await createSearchIndex('userIdx', 'user:', userSchema, {
    language: 'english',
    stopwords: ['a', 'an', 'the', 'and', 'or'] // Common words to ignore in search
  });

  logger.info('User search index setup result:', { meta: result });
  return result;
});

/**
 * Example: Searching users with specific criteria
 */
export const searchUsers = catchAsync(async (searchTerm, options = {}) => {
  // Build a query that searches across name and email
  let query = searchTerm ? `@name:(${searchTerm}*) | @emailAddress:(${searchTerm}*)` : '*';

  // Setup search options
  const searchOptions = {
    limit: options.limit || 10,
    offset: options.offset || 0,
    sortBy: options.sortBy || 'lastLoginAt',
    sortDirection: options.sortDirection || 'DESC',
    returnFields: ['name', 'emailAddress', 'role', 'lastLoginAt']
  };

  // If filtering by role
  if (options.role) {
    query += ` @role:{${options.role}}`;
  }

  const results = await searchIndex('userIdx', query, searchOptions);

  logger.info(`User search for "${searchTerm}" returned ${results.totalResults} results`);
  return results;
});

/**
 * Example: Using Bloom Filter for rate limiting
 *
 * This demonstrates using a Bloom filter to implement a simple
 * rate limiting system that can efficiently check if an IP address
 * has made too many requests in a time window.
 */
export const setupRateLimiter = catchAsync(async () => {
  // Create a Bloom filter with a low error rate and high capacity
  // Error rate 0.01 means 1% false positive rate
  // Capacity 100000 means it can handle that many unique items efficiently
  const result = await createBloomFilter('rate_limiter', 0.01, 100000);
  logger.info('Rate limiter bloom filter setup result:', { meta: result });
  return result;
});

/**
 * Example: Check if an IP is rate limited
 *
 * Uses a bloom filter to implement a sliding window rate limiter
 * by combining the IP address with a time window identifier.
 */
export const checkRateLimit = catchAsync(async (ip, endpoint, windowSizeMinutes = 15) => {
  // Create a time-window identifier (e.g., current hour, 15-minute window, etc.)
  const now = new Date();
  const windowId = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}-${Math.floor(now.getUTCMinutes() / windowSizeMinutes)}`;

  // Combine IP, endpoint, and window ID to create a unique key for this time window
  const key = `${ip}:${endpoint}:${windowId}`;

  // Check if this IP+endpoint combination is already in the filter for this window
  const exists = await checkBloomFilter('rate_limiter', key);

  if (!exists) {
    // If not in the filter, add it (meaning this is the first request in this window)
    await addToBloomFilter('rate_limiter', key);
    return { limited: false, key };
  }

  // If it might exist, it could be a repeat request in this time window
  // Note: Bloom filters can have false positives but never false negatives
  // In a real implementation, you might want to combine this with a counter in Redis
  return { limited: true, key };
});

/**
 * Example: Get information about the bloom filter's status
 */
export const getRateLimiterStatus = catchAsync(async () => {
  const info = await getBloomFilterInfo('rate_limiter');
  logger.info('Rate limiter bloom filter status:', { meta: info });
  return info;
});

/**
 * Example: Combined usage for user search with rate limiting
 */
export const searchUsersWithRateLimit = catchAsync(async (searchTerm, ip, options = {}) => {
  // First check if the IP is rate limited
  const rateCheck = await checkRateLimit(ip, 'user_search', 5); // 5-minute window

  if (rateCheck.limited) {
    logger.warn(`Rate limit exceeded for IP ${ip} on user search`);
    return { error: 'Rate limit exceeded, please try again later', limited: true };
  }

  // If not rate limited, perform the search
  const results = await searchUsers(searchTerm, options);
  return { ...results, limited: false };
});

/**
 * Example: Clean up resources
 */
export const cleanupRedisResources = catchAsync(async () => {
  await deleteSearchIndex('userIdx');
  // Note: Redis Bloom doesn't have a direct 'drop filter' command,
  // so we would need to use DEL on the key
  logger.info('Redis resources cleaned up');
  return { success: true };
});
