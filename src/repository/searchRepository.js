import { client } from '../connections/connectElasticSearch.js';
import { logger } from '../utils/logger.js';
import { httpError } from '../utils/httpError.js';
import { SEARCH_ERROR_CODES } from '../constants/searchConstants.js';
import asyncHandler from 'express-async-handler';
// Core search operations
export const executeSearch = asyncHandler(async (query, indexName) => {
  logger.debug('Executing search', { meta: { indexName, body: query } });
  const response = await client.search({
    index: indexName,
    body: query
  });
  // logger.debug('Search executed successfully', { meta: { indexName, took: response.took, response } });
  return response;
});

export const executeKNNSearch = asyncHandler(async (knnQuery, indexName) => {
  const response = await client.search({
    index: indexName,
    body: knnQuery
  });
  logger.info('KNN search executed successfully', {
    meta: { indexName, took: response.took, response }
  });
  return response;
});

export const executeAggregation = asyncHandler(async (query, aggregations, indexName) => {
  const response = await client.search({
    index: indexName,
    body: {
      ...query,
      aggs: aggregations
    }
  });
  logger.info('Aggregation search executed successfully', {
    meta: { indexName, took: response.took, response }
  });
  return response;
});

// Document operations
export const indexDocument = asyncHandler(async (document, indexName, id = null) => {
  const params = {
    index: indexName,
    body: document
  };

  if (id) {
    params.id = id;
  }

  const response = await client.index(params);
  logger.info('Document indexed successfully', { meta: { indexName, id: response._id, response } });
  return response;
});

export const bulkIndex = asyncHandler(async (documents, indexName, req, next) => {
  const body = documents.flatMap((doc) => {
    // Handle documents with Elasticsearch metadata structure
    if (doc._source) {
      return [
        {
          index: {
            _index: doc._index || indexName,
            _id: doc._id,
            _routing: doc._routing
          }
        },
        doc._source
      ];
    }

    // Handle plain document objects
    return [
      {
        index: {
          _index: indexName,
          _id: doc.id || doc._id
        }
      },
      doc
    ];
  });

  const response = await client.bulk({ body });

  if (response.errors) {
    const errorItems = response.items.filter((item) => item.index?.error);
    logger.error('Bulk index completed with errors', {
      meta: {
        indexName,
        errorCount: errorItems.length,
        totalItems: response.items.length,
        errors: errorItems.map((item) => item.index.error)
      }
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.BULK_INDEX_FAILED), req, 400);
  }

  logger.info('Bulk index completed successfully', {
    meta: {
      indexName,
      total: documents.length,
      took: response.took,
      response
    }
  });
  return response;
});

export const updateDocument = asyncHandler(async (id, document, indexName) => {
  const response = await client.update({
    index: indexName,
    id,
    body: {
      doc: document
    }
  });
  logger.info('Document updated successfully', { meta: { indexName, id, response } });
  return response;
});

export const deleteDocument = asyncHandler(async (id, indexName) => {
  const response = await client.delete({
    index: indexName,
    id
  });
  logger.info('Document deleted successfully', { meta: { indexName, id, response } });
  return response;
});

// Index management functions
export const createIndex = asyncHandler(async (indexName, mapping, settings) => {
  const response = await client.indices.create({
    index: indexName,
    body: {
      mappings: mapping,
      settings
    }
  });
  logger.info('Index created successfully', { meta: { indexName, response } });
  return response;
});

export const updateIndexMapping = asyncHandler(async (indexName, mapping) => {
  const response = await client.indices.putMapping({
    index: indexName,
    body: mapping
  });
  logger.info('Index mapping updated successfully', { meta: { indexName, response } });
  return response;
});

export const deleteIndex = asyncHandler(async (indexName) => {
  const response = await client.indices.delete({
    index: indexName
  });
  logger.info('Index deleted successfully', { meta: { indexName, response } });
  return response;
});

// N-gram search operations
export const executeNgramSearch = asyncHandler(async (query, indexName) => {
  logger.debug('Executing N-gram search', { meta: { indexName, body: query } });
  const response = await client.search({
    index: indexName,
    body: query
  });
  logger.info('N-gram search executed successfully', {
    meta: { indexName, took: response.took, response }
  });
  return response;
});

// Fuzzy search operations
export const executeFuzzySearch = asyncHandler(async (query, indexName) => {
  const response = await client.search({
    index: indexName,
    body: query
  });
  logger.info('Fuzzy search executed successfully', {
    meta: { indexName, took: response.took, response }
  });
  return response;
});
/**
 * Check Elasticsearch cluster health
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Elasticsearch health information
 */
export const checkElasticsearchHealth = asyncHandler(async () => {
  const response = await client.cluster.health();
  logger.info('Elasticsearch health check completed', {
    meta: {
      status: response.status,
      cluster_name: response.cluster_name,
      response
    }
  });
  return response;
});
