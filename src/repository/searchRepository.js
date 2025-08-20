import { client } from '../connections/connectElasticSearch.js';
import { catchAsync } from '../utils/catchAsync.js';
import { logger } from '../utils/logger.js';
import { httpError } from '../utils/httpError.js';
import { SEARCH_ERROR_CODES } from '../constants/searchConstants.js';

// Core search operations
export const executeSearch = catchAsync(async (query, indexName, req, next) => {
  try {
    const response = await client.search({
      index: indexName,
      body: query
    });
    logger.info('Search executed successfully', { meta: { indexName, took: response.took } });
    return response;
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      logger.error('Index not found', { indexName, error: error.message });
      return httpError(next, new Error(SEARCH_ERROR_CODES.INDEX_NOT_FOUND), req, 404);
    }

    logger.error('Search execution failed', { indexName, error: error.message });
    return httpError(next, new Error(SEARCH_ERROR_CODES.INVALID_QUERY), req, 400);
  }
});

export const executeKNNSearch = catchAsync(async (knnQuery, indexName, req, next) => {
  try {
    const response = await client.search({
      index: indexName,
      body: knnQuery
    });
    logger.info('KNN search executed successfully', { indexName, took: response.took });
    return response;
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      logger.error('Index not found for KNN search', { indexName, error: error.message });
      return httpError(next, new Error(SEARCH_ERROR_CODES.INDEX_NOT_FOUND), req, 404);
    }

    logger.error('KNN search execution failed', { indexName, error: error.message });
    return httpError(next, new Error(SEARCH_ERROR_CODES.KNN_ERROR), req, 400);
  }
});

export const executeAggregation = catchAsync(async (query, aggregations, indexName, req, next) => {
  try {
    const response = await client.search({
      index: indexName,
      body: {
        ...query,
        aggs: aggregations
      }
    });
    logger.info('Aggregation search executed successfully', { indexName, took: response.took });
    return response;
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      logger.error('Index not found for aggregation', { indexName, error: error.message });
      return httpError(next, new Error(SEARCH_ERROR_CODES.INDEX_NOT_FOUND), req, 404);
    }

    logger.error('Aggregation search execution failed', { indexName, error: error.message });
    return httpError(next, new Error(SEARCH_ERROR_CODES.AGGREGATION_ERROR), req, 400);
  }
});

// Document operations
export const indexDocument = catchAsync(async (document, indexName, id = null, req, next) => {
  try {
    const params = {
      index: indexName,
      body: document
    };

    if (id) {
      params.id = id;
    }

    const response = await client.index(params);
    logger.info('Document indexed successfully', { indexName, id: response._id });
    return response;
  } catch (error) {
    logger.error('Document indexing failed', { indexName, id, error: error.message });
    return httpError(next, new Error(SEARCH_ERROR_CODES.INDEX_OPERATION_FAILED), req, 500);
  }
});

export const bulkIndex = catchAsync(async (documents, indexName, req, next) => {
  try {
    const body = documents.flatMap((doc) => [{ index: { _index: indexName } }, doc]);

    const response = await client.bulk({ body });

    if (response.errors) {
      const errorItems = response.items.filter((item) => item.index?.error);
      logger.error('Bulk index completed with errors', {
        indexName,
        errorCount: errorItems.length,
        totalItems: response.items.length,
        errors: errorItems.map((item) => item.index.error)
      });
      return httpError(next, new Error(SEARCH_ERROR_CODES.BULK_INDEX_FAILED), req, 400);
    }

    logger.info('Bulk index completed successfully', {
      indexName,
      total: documents.length,
      took: response.took
    });
    return response;
  } catch (error) {
    logger.error('Bulk index operation failed', { indexName, error: error.message });
    return httpError(next, new Error(SEARCH_ERROR_CODES.BULK_INDEX_FAILED), req, 500);
  }
});

export const updateDocument = catchAsync(async (id, document, indexName, req, next) => {
  try {
    const response = await client.update({
      index: indexName,
      id,
      body: {
        doc: document
      }
    });
    logger.info('Document updated successfully', { indexName, id });
    return response;
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      logger.error('Document not found for update', { indexName, id, error: error.message });
      return httpError(next, new Error(SEARCH_ERROR_CODES.DOCUMENT_NOT_FOUND), req, 404);
    }

    logger.error('Document update failed', { indexName, id, error: error.message });
    return httpError(next, new Error(SEARCH_ERROR_CODES.UPDATE_OPERATION_FAILED), req, 500);
  }
});

export const deleteDocument = catchAsync(async (id, indexName, req, next) => {
  try {
    const response = await client.delete({
      index: indexName,
      id
    });
    logger.info('Document deleted successfully', { indexName, id });
    return response;
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      logger.error('Document not found for deletion', { indexName, id, error: error.message });
      return httpError(next, new Error(SEARCH_ERROR_CODES.DOCUMENT_NOT_FOUND), req, 404);
    }

    logger.error('Document deletion failed', { indexName, id, error: error.message });
    return httpError(next, new Error(SEARCH_ERROR_CODES.DELETE_OPERATION_FAILED), req, 500);
  }
});

// Index management functions
export const createIndex = catchAsync(async (indexName, mapping, settings, req, next) => {
  try {
    const response = await client.indices.create({
      index: indexName,
      body: {
        mappings: mapping,
        settings
      }
    });
    logger.info('Index created successfully', { indexName });
    return response;
  } catch (error) {
    if (
      error.meta?.statusCode === 400 &&
      error.meta?.body?.error?.type === 'resource_already_exists_exception'
    ) {
      logger.warn('Index already exists', { indexName });
      return httpError(next, new Error(SEARCH_ERROR_CODES.INDEX_ALREADY_EXISTS), req, 409);
    }

    logger.error('Index creation failed', { indexName, error: error.message });
    return httpError(next, new Error(SEARCH_ERROR_CODES.INDEX_CREATION_FAILED), req, 500);
  }
});

export const updateIndexMapping = catchAsync(async (indexName, mapping, req, next) => {
  try {
    const response = await client.indices.putMapping({
      index: indexName,
      body: mapping
    });
    logger.info('Index mapping updated successfully', { indexName });
    return response;
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      logger.error('Index not found for mapping update', { indexName, error: error.message });
      return httpError(next, new Error(SEARCH_ERROR_CODES.INDEX_NOT_FOUND), req, 404);
    }

    logger.error('Index mapping update failed', { indexName, error: error.message });
    return httpError(next, new Error(SEARCH_ERROR_CODES.MAPPING_UPDATE_FAILED), req, 500);
  }
});

export const deleteIndex = catchAsync(async (indexName, req, next) => {
  try {
    const response = await client.indices.delete({
      index: indexName
    });
    logger.info('Index deleted successfully', { indexName });
    return response;
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      logger.error('Index not found for deletion', { indexName, error: error.message });
      return httpError(next, new Error(SEARCH_ERROR_CODES.INDEX_NOT_FOUND), req, 404);
    }

    logger.error('Index deletion failed', { indexName, error: error.message });
    return httpError(next, new Error(SEARCH_ERROR_CODES.INDEX_DELETION_FAILED), req, 500);
  }
});

// Import query builders from separate module
export {
  buildMultiFieldQuery,
  buildSemanticQuery,
  buildKNNQuery,
  buildAggregationQuery,
  buildNgramQuery,
  buildFuzzyQuery
} from './searchQueryBuilders.js';

// N-gram search operations
export const executeNgramSearch = catchAsync(async (query, indexName, req, next) => {
  try {
    const response = await client.search({
      index: indexName,
      body: query
    });
    logger.info('N-gram search executed successfully', { indexName, took: response.took });
    return response;
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      logger.error('Index not found for n-gram search', { indexName, error: error.message });
      return httpError(next, new Error(SEARCH_ERROR_CODES.INDEX_NOT_FOUND), req, 404);
    }

    logger.error('N-gram search execution failed', { indexName, error: error.message });
    return httpError(next, new Error(SEARCH_ERROR_CODES.INVALID_QUERY), req, 400);
  }
});

// Fuzzy search operations
export const executeFuzzySearch = catchAsync(async (query, indexName, req, next) => {
  try {
    const response = await client.search({
      index: indexName,
      body: query
    });
    logger.info('Fuzzy search executed successfully', { indexName, took: response.took });
    return response;
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      logger.error('Index not found for fuzzy search', { indexName, error: error.message });
      return httpError(next, new Error(SEARCH_ERROR_CODES.INDEX_NOT_FOUND), req, 404);
    }

    logger.error('Fuzzy search execution failed', { indexName, error: error.message });
    return httpError(next, new Error(SEARCH_ERROR_CODES.INVALID_QUERY), req, 400);
  }
});
/**
 * Check Elasticsearch cluster health
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Elasticsearch health information
 */
export const checkElasticsearchHealth = catchAsync(async (req, next) => {
  try {
    const response = await client.cluster.health();
    logger.info('Elasticsearch health check completed', {
      status: response.status,
      cluster_name: response.cluster_name
    });
    return response;
  } catch (error) {
    logger.error('Elasticsearch health check failed', {
      error: error.message,
      stack: error.stack
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.ELASTICSEARCH_CONNECTION_ERROR), req, 500);
  }
});
