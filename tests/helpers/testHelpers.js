/**
 * Test helpers and utilities for health feature tests
 * Provides common testing functions and setup utilities
 */

import { setTimeout } from 'timers/promises';

/**
 * Wait for a condition to be true with timeout
 * @param {Function} condition - Function that returns boolean
 * @param {number} timeout - Timeout in milliseconds
 * @param {number} interval - Check interval in milliseconds
 * @returns {Promise<boolean>} - True if condition met, false if timeout
 */
export const waitForCondition = async (condition, timeout = 5000, interval = 100) => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await setTimeout(interval);
  }

  return false;
};

/**
 * Create a mock request object for testing
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock request object
 */
export const createMockRequest = (overrides = {}) => ({
  ip: '127.0.0.1',
  method: 'GET',
  originalUrl: '/api/v1/health/self',
  headers: {},
  query: {},
  params: {},
  body: {},
  ...overrides
});

/**
 * Create a mock response object for testing
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock response object
 */
export const createMockResponse = (overrides = {}) => {
  const res = {
    statusCode: 200,
    headers: {},
    data: null,
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (data) {
      this.data = data;
      return this;
    },
    send: function (data) {
      this.data = data;
      return this;
    },
    set: function (key, value) {
      this.headers[key] = value;
      return this;
    },
    ...overrides
  };

  return res;
};

/**
 * Setup test environment variables
 * @param {Object} env - Environment variables to set
 * @returns {Function} Cleanup function to restore original values
 */
export const setupTestEnvironment = (env = {}) => {
  const originalEnv = {};

  // Store original values
  Object.keys(env).forEach((key) => {
    originalEnv[key] = process.env[key];
    process.env[key] = env[key];
  });

  // Return cleanup function
  return () => {
    Object.keys(env).forEach((key) => {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    });
  };
};

/**
 * Measure execution time of a function
 * @param {Function} fn - Function to measure
 * @returns {Promise<{result: any, duration: number}>} Result and duration in ms
 */
export const measureExecutionTime = async (fn) => {
  const startTime = Date.now();
  const result = await fn();
  const duration = Date.now() - startTime;

  return { result, duration };
};

/**
 * Generate a random port number for testing
 * @param {number} min - Minimum port number
 * @param {number} max - Maximum port number
 * @returns {number} Random port number
 */
export const getRandomPort = (min = 8000, max = 9000) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise<any>} Result of the function
 */
export const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      await setTimeout(delay);
    }
  }
};

/**
 * Create a timeout promise that rejects after specified time
 * @param {number} ms - Timeout in milliseconds
 * @param {string} message - Error message
 * @returns {Promise} Promise that rejects after timeout
 */
export const createTimeout = (ms, message = 'Operation timed out') =>
  new Promise((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });

/**
 * Race a promise against a timeout
 * @param {Promise} promise - Promise to race
 * @param {number} timeout - Timeout in milliseconds
 * @param {string} timeoutMessage - Timeout error message
 * @returns {Promise} Promise that resolves or rejects
 */
export const withTimeout = (promise, timeout, timeoutMessage) =>
  Promise.race([promise, createTimeout(timeout, timeoutMessage)]);

/**
 * Validate response structure for health endpoints
 * @param {Object} response - Response object to validate
 * @param {boolean} expectSuccess - Whether to expect success
 * @returns {boolean} True if valid structure
 */
export const validateResponseStructure = (response, expectSuccess = true) => {
  if (typeof response !== 'object' || response === null) {
    return false;
  }

  const hasRequiredFields =
    typeof response.success === 'boolean' &&
    typeof response.statusCode === 'number' &&
    typeof response.message === 'string';

  if (!hasRequiredFields) {
    return false;
  }

  if (expectSuccess) {
    return response.success === true && response.data !== null;
  } else {
    return response.success === false;
  }
};

/**
 * Generate test data for load testing
 * @param {number} count - Number of test items to generate
 * @param {Function} generator - Function to generate each item
 * @returns {Array} Array of generated test data
 */
export const generateTestData = (count, generator) =>
  Array(count)
    .fill()
    .map((_, index) => generator(index));

/**
 * Calculate statistics for an array of numbers
 * @param {number[]} values - Array of numeric values
 * @returns {Object} Statistics object
 */
export const calculateStats = (values) => {
  if (values.length === 0) {
    return { min: 0, max: 0, avg: 0, median: 0, count: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, val) => acc + val, 0);

  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: sum / values.length,
    median: sorted[Math.floor(sorted.length / 2)],
    count: values.length
  };
};

export default {
  waitForCondition,
  createMockRequest,
  createMockResponse,
  setupTestEnvironment,
  measureExecutionTime,
  getRandomPort,
  retryWithBackoff,
  createTimeout,
  withTimeout,
  validateResponseStructure,
  generateTestData,
  calculateStats
};
