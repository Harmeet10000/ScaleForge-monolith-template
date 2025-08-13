#!/usr/bin/env node

/**
 * Database Backup Script
 *
 * This script creates daily backups of MongoDB database using mongodump
 * It uses node-cron to schedule backups at a specific time each day
 * Backups are stored with timestamps and old backups are automatically cleaned up
 */

import cron from 'node-cron';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import zlib from 'zlib';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Configure environment variables based on NODE_ENV
const NODE_ENV = process.env.NODE_ENV || 'development';
dotenv.config({ path: `.env.${NODE_ENV}` });

// Get directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const config = {
  // Database connection string from environment variables
  dbUrl: process.env.DATABASE_URL || 'mongodb://localhost:27017/auth-service',

  // Backup directory - created relative to this script
  backupDir: path.join(__dirname, '../backups'),

  // Backup schedule (default: 2:00 AM every day)
  // Cron format: minute hour day-of-month month day-of-week
  schedule: '0 2 * * *',

  // Number of days to keep backups (older backups will be deleted)
  retentionDays: 7,

  // S3 configuration
  s3: {
    enabled: process.env.S3_BACKUP_ENABLED === 'true',
    bucket: process.env.S3_BUCKET_NAME || 'db-backups',
    region: process.env.AWS_REGION || 'us-east-1',
    prefix: process.env.S3_PREFIX || 'mongodb-backups/'
  }
};

// Create backup directory if it doesn't exist
if (!fs.existsSync(config.backupDir)) {
  fs.mkdirSync(config.backupDir, { recursive: true });
  console.log(`Created backup directory: ${config.backupDir}`);
}

/**
 * Compress a directory using zlib gzip
 * @param {string} dirPath - Path to the directory to compress
 * @returns {Promise<string>} - Path to the compressed file
 */
async function compressBackup(dirPath) {
  return new Promise((resolve, reject) => {
    const tarCommand = `tar -cf - -C ${path.dirname(dirPath)} ${path.basename(dirPath)}`;
    const outputPath = `${dirPath}.tar.gz`;
    const gzip = zlib.createGzip({ level: zlib.constants.Z_BEST_COMPRESSION });
    const output = createWriteStream(outputPath);

    console.log(`Compressing backup: ${dirPath}`);

    const tar = exec(tarCommand);

    // Create pipeline: tar output -> gzip -> file
    tar.stdout.pipe(gzip).pipe(output);

    output.on('finish', () => {
      console.log(`Compression complete: ${outputPath}`);
      resolve(outputPath);
    });

    tar.on('error', (err) => {
      console.error(`Tar error: ${err.message}`);
      reject(err);
    });

    gzip.on('error', (err) => {
      console.error(`Gzip error: ${err.message}`);
      reject(err);
    });

    output.on('error', (err) => {
      console.error(`Output file error: ${err.message}`);
      reject(err);
    });
  });
}

/**
 * Upload a file to S3
 * @param {string} filePath - Path to the file to upload
 * @returns {Promise<boolean>} - True if successful
 */
async function uploadToS3(filePath) {
  if (!config.s3.enabled) {
    console.log('S3 uploads are disabled. Skipping upload.');
    return false;
  }

  try {
    // Initialize S3 client
    const s3Client = new S3Client({
      region: config.s3.region
    });

    const fileName = path.basename(filePath);
    const key = `${config.s3.prefix}${fileName}`;

    console.log(`Uploading ${fileName} to S3 bucket ${config.s3.bucket}...`);

    // Create readable stream for the file
    const fileStream = createReadStream(filePath);

    // Upload to S3
    const command = new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
      Body: fileStream,
      ContentType: 'application/gzip'
    });

    const response = await s3Client.send(command);

    console.log(`Upload complete! ETag: ${response.ETag}`);
    console.log(`File available at: s3://${config.s3.bucket}/${key}`);

    return true;
  } catch (err) {
    console.error(`S3 upload error: ${err.message}`);
    return false;
  }
}

/**
 * Perform database backup using mongodump
 */
async function performBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(config.backupDir, `backup-${timestamp}`);

  // Create command for mongodump
  // Using --uri for connection with authentication included
  const cmd = `mongodump --uri="${config.dbUrl}" --out="${backupPath}"`;

  console.log(`Starting database backup at ${new Date().toLocaleString()}...`);

  try {
    // Execute mongodump
    await new Promise((resolve, reject) => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error(`Backup error: ${error.message}`);
          reject(error);
          return;
        }

        if (stderr) {
          console.error(`Backup stderr: ${stderr}`);
        }

        console.log(`Backup completed successfully to: ${backupPath}`);
        console.log(`Stdout: ${stdout}`);
        resolve();
      });
    });

    // Compress the backup
    const compressedPath = await compressBackup(backupPath);

    // Upload to S3 if enabled
    if (config.s3.enabled) {
      await uploadToS3(compressedPath);
    }

    // Clean up old backups
    await cleanupOldBackups();

    // If it's a one-time backup, exit after completion
    if (process.env.RUN_BACKUP_ONCE === 'true') {
      console.log('One-time backup completed. Exiting...');
      process.exit(0);
    }
  } catch (error) {
    console.error(`Backup process failed: ${error.message}`);

    // If it's a one-time backup, exit with error code
    if (process.env.RUN_BACKUP_ONCE === 'true') {
      process.exit(1);
    }
  }
}

/**
 * Clean up backups older than the retention period
 */
function cleanupOldBackups() {
  fs.readdir(config.backupDir, (err, files) => {
    if (err) {
      console.error(`Error reading backup directory: ${err.message}`);
      return;
    }

    const now = new Date().getTime();
    const retentionMs = config.retentionDays * 24 * 60 * 60 * 1000;

    files.forEach((file) => {
      const filePath = path.join(config.backupDir, file);

      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error(`Error getting file stats: ${err.message}`);
          return;
        }

        // Check if the file/directory is older than retention period
        if (now - stats.mtime.getTime() > retentionMs) {
          // If it's a directory, use recursive removal
          if (stats.isDirectory()) {
            fs.rm(filePath, { recursive: true, force: true }, (err) => {
              if (err) {
                console.error(`Error removing old backup directory ${filePath}: ${err.message}`);
              } else {
                console.log(`Removed old backup: ${filePath}`);
              }
            });
          } else {
            // For files, use unlink
            fs.unlink(filePath, (err) => {
              if (err) {
                console.error(`Error removing old backup file ${filePath}: ${err.message}`);
              } else {
                console.log(`Removed old backup file: ${filePath}`);
              }
            });
          }
        }
      });
    });
  });
}

// If RUN_BACKUP_ONCE is set to true, run a single backup and exit
if (process.env.RUN_BACKUP_ONCE === 'true') {
  console.log('Starting one-time backup...');
  performBackup();
} else {
  // Schedule the backup job
  cron.schedule(config.schedule, performBackup, {
    scheduled: true,
    timezone: 'UTC' // You can change this to your local timezone
  });

  console.log(`Database backup job scheduled: ${config.schedule} (UTC)`);
  console.log(`Backups will be stored in: ${config.backupDir}`);
  console.log(`Backups will be kept for ${config.retentionDays} days`);
  console.log('Backup service is running...');
}
