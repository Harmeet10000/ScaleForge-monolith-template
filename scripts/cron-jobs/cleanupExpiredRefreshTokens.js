import cron from 'node-cron';
import { db } from '../../src/connections/connectDB.js'; // Adjust if your connectDB exports are different for JS
import { refreshTokens } from '../../src/db/models/refreshToken.js';
import { logger } from '../../src/utils/logger.js';
import { lt } from 'drizzle-orm';
import config from '../../src/config/dotenvConfig.js';

// Configure environment variables
const NODE_ENV = config.NODE_ENV || 'development';

logger.info(`Running in ${NODE_ENV} mode.`);

const cleanupTokens = async () => {
  logger.info('Starting cleanup of expired refresh tokens...');
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const result = await db
      .delete(refreshTokens)
      .where(lt(refreshTokens.createdAt, sevenDaysAgo))
      .returning({ id: refreshTokens.id }); // Optional: get the IDs of deleted tokens

    if (result.length > 0) {
      logger.info(`Successfully deleted ${result.length} expired refresh tokens.`);
    } else {
      logger.info('No expired refresh tokens found to delete.');
    }
  } catch (error) {
    logger.error('Error during refresh token cleanup:', {
      error: error.message,
      stack: error.stack
    });
  }
};

// Schedule the job to run every day at 12:00 AM
// Cron format: minute hour day-of-month month day-of-week
const schedule = '0 0 * * *';

cron.schedule(schedule, cleanupTokens, {
  scheduled: true,
  timezone: 'UTC' // Or your preferred timezone
});

logger.info(`Refresh token cleanup job scheduled: ${schedule} (UTC)`);
logger.info('Cleanup service is running...');

// Keep the script running if it's not managed by PM2 or similar
// For a simple cron script, this might not be necessary if the cron daemon handles execution.
// If running directly with `node`, the process would exit after scheduling.
// To keep it alive (e.g., if this script itself is the long-running process):
// setInterval(() => {}, 1 << 30); // Keeps node process alive
