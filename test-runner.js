#!/usr/bin/env node

import { run } from 'node:test';
import { spec } from 'node:test/reporters';
import { glob } from 'glob';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  testPattern: process.env.TEST_PATTERN || '**/*.test.js',
  testDir: process.env.TEST_DIR || 'tests',
  timeout: parseInt(process.env.TEST_TIMEOUT) || 30000,
  concurrency: parseInt(process.env.TEST_CONCURRENCY) || 4,
  coverage: process.env.NODE_TEST_COVERAGE === 'true' || process.argv.includes('--coverage'),
  watch: process.argv.includes('--watch'),
  verbose: process.argv.includes('--verbose') || process.env.NODE_ENV === 'development'
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Logger utility
const logger = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}\n`)
};

// Find test files
async function findTestFiles() {
  try {
    const testPattern = path.join(__dirname, config.testDir, config.testPattern);
    const files = await glob(testPattern, {
      ignore: ['**/node_modules/**'],
      absolute: true
    });

    if (files.length === 0) {
      logger.warning(`No test files found matching pattern: ${testPattern}`);
      return [];
    }

    logger.info(`Found ${files.length} test file(s)`);
    if (config.verbose) {
      files.forEach((file) => logger.info(`  - ${path.relative(__dirname, file)}`));
    }

    return files;
  } catch (error) {
    logger.error(`Error finding test files: ${error.message}`);
    return [];
  }
}

// Setup test environment
async function setupTestEnvironment() {
  logger.header('🧪 Setting up test environment');

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

  // Mock external dependencies if needed
  if (!process.env.DATABASE) {
    process.env.DATABASE = 'mongodb://localhost:27017/auth-service-test';
  }

  if (!process.env.REDIS_HOST) {
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
  }

  logger.success('Test environment configured');
}

// Cleanup test environment
async function cleanupTestEnvironment() {
  logger.info('🧹 Cleaning up test environment');

  // Close any open connections
  try {
    // Import and close database connections if they exist
    const { disconnectMongo } = await import('./src/connections/connectDB.js').catch(() => ({}));
    const { disconnectRedis } = await import('./src/connections/connectRedis.js').catch(() => ({}));

    if (disconnectMongo) await disconnectMongo().catch(() => {});
    if (disconnectRedis) await disconnectRedis().catch(() => {});

    logger.success('Test environment cleaned up');
  } catch (error) {
    logger.warning(`Cleanup warning: ${error.message}`);
  }
}

// Run tests
async function runTests() {
  logger.header('🚀 Starting Test Runner');

  await setupTestEnvironment();

  const testFiles = await findTestFiles();

  if (testFiles.length === 0) {
    logger.error('No test files found. Exiting.');
    process.exit(1);
  }

  try {
    logger.info(`Running tests with concurrency: ${config.concurrency}`);
    logger.info(`Test timeout: ${config.timeout}ms`);

    const stream = run({
      files: testFiles,
      concurrency: config.concurrency,
      timeout: config.timeout,
      coverage: config.coverage
    });

    // Use spec reporter for better output
    stream.compose(spec).pipe(process.stdout);

    // Handle test completion
    let exitCode = 0;

    stream.on('test:fail', () => {
      exitCode = 1;
    });

    stream.on('test:complete', async () => {
      await cleanupTestEnvironment();

      if (exitCode === 0) {
        logger.success('All tests passed! 🎉');
      } else {
        logger.error('Some tests failed! 💥');
      }

      process.exit(exitCode);
    });
  } catch (error) {
    logger.error(`Test runner error: ${error.message}`);
    await cleanupTestEnvironment();
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', async () => {
  logger.warning('Test runner interrupted');
  await cleanupTestEnvironment();
  process.exit(130);
});

process.on('SIGTERM', async () => {
  logger.warning('Test runner terminated');
  await cleanupTestEnvironment();
  process.exit(143);
});

// Start the test runner
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(async (error) => {
    logger.error(`Fatal error: ${error.message}`);
    await cleanupTestEnvironment();
    process.exit(1);
  });
}

export { runTests, findTestFiles, setupTestEnvironment, cleanupTestEnvironment };
