import { client } from '../../connections/connectElasticSearch.js';
import { logger } from '../../utils/logger.js';
import { httpError } from '../../utils/httpError.js';
import { SEARCH_ERROR_CODES } from './searchConstants.js';
import asyncHandler from 'express-async-handler';
// Core search operations
export const executeSearch = asyncHandler(async (query, indexName) => {
  const response = await client.search({
    index: indexName,
    body: query
  });
  //   return response;
});

export const executeKNNSearch = asyncHandler(async (knnQuery, indexName) => {
  const response = await client.search({
    index: indexName,
    body: knnQuery
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
  return response;
});

export const deleteDocument = asyncHandler(async (id, indexName) => {
  const response = await client.delete({
    index: indexName,
    id
  });
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
  return response;
});

export const updateIndexMapping = asyncHandler(async (indexName, mapping) => {
  const response = await client.indices.putMapping({
    index: indexName,
    body: mapping
  });
  return response;
});

export const deleteIndex = asyncHandler(async (indexName) => {
  const response = await client.indices.delete({
    index: indexName
  });
  return response;
});

// N-gram search operations
export const executeNgramSearch = asyncHandler(async (query, indexName) => {
  const response = await client.search({
    index: indexName,
    body: query
  });
  return response;
});

// Fuzzy search operations
export const executeFuzzySearch = asyncHandler(async (query, indexName) => {
  const response = await client.search({
    index: indexName,
    body: query
  });
  return response;
});

export const checkElasticsearchHealth = asyncHandler(async () => {
  const response = await client.cluster.health();
  return response;
});
