import { Client } from '@elastic/elasticsearch';
import { logger } from '../utils/logger.js';
import asyncHandler from 'express-async-handler';

export const client = new Client({
  node: process.env.ELASTICSEARCH_HOST,
  auth: {
    apiKey: process.env.ELASTICSEARCH_API_KEY
  },
  maxRetries: 3,
  requestTimeout: 40000,
  sniffOnStart: false,
  sniffInterval: false,
  compression: 'gzip',
  ssl: {
    rejectUnauthorized: process.env.NODE_ENV === 'production'
  }
});

export const connectElasticsearch = asyncHandler(async () => {
  await client.ping();
  logger.info('Elasticsearch connected successfully');
  return true;
});

export const disconnectElasticsearch = asyncHandler(async () => {
  await client.close();
  logger.info('Elasticsearch connection closed');
});
