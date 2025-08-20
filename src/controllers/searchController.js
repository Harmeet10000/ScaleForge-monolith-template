import { httpResponse } from '../utils/httpResponse.js';
import { httpError } from '../utils/httpError.js';
import { catchAsync } from '../utils/catchAsync.js';
import {
  validateJoiSchema,
  validateSearchRequest,
  validateSemanticSearchRequest,
  validateKNNSearchRequest,
  validateNgramSearchRequest,
  validateFuzzySearchRequest,
  validateAggregationRequest,
  validateIndexDocumentRequest,
  validateBulkIndexRequest,
  validateUpdateDocumentRequest,
  validateDeleteDocumentRequest,
  validateCreateIndexRequest,
  validateCreatePipelineRequest,
  validateUpdatePipelineRequest,
  validateDeletePipelineRequest,
  validateDeleteIndexRequest
} from '../validations/searchValidation.js';
import * as searchService from '../services/searchService.js';
import { SEARCH_MESSAGES } from '../constants/searchConstants.js';

/**
 * Search Controller
 * Handles HTTP requests and responses for all search operations
 */

// Core Search Endpoints

/**
 * Multi-field search endpoint with validation and error handling
 * @route GET /api/v1/search
 */
export const search = catchAsync(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateSearchRequest, req.query);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const results = await searchService.performSearch(value, req, next);
  if (!results) {
    return; // Error already handled by service
  }

  httpResponse(req, res, 200, SEARCH_MESSAGES.SEARCH_SUCCESS, results);
});

/**
 * Semantic search endpoint for vector-based queries
 * @route POST /api/v1/search/semantic
 */
export const semanticSearch = catchAsync(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateSemanticSearchRequest, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const results = await searchService.performSemanticSearch(value, req, next);
  if (!results) {
    return; // Error already handled by service
  }

  httpResponse(req, res, 200, SEARCH_MESSAGES.SEMANTIC_SEARCH_SUCCESS, results);
});

/**
 * KNN search endpoint for similarity matching
 * @route POST /api/v1/search/knn
 */
export const knnSearch = catchAsync(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateKNNSearchRequest, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const results = await searchService.performKNNSearch(value, req, next);
  if (!results) {
    return; // Error already handled by service
  }

  httpResponse(req, res, 200, SEARCH_MESSAGES.KNN_SEARCH_SUCCESS, results);
});

/**
 * Aggregation search endpoint for analytics
 * @route POST /api/v1/search/aggregate
 */
export const aggregateSearch = catchAsync(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateAggregationRequest, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const results = await searchService.performAggregatedSearch(value, req, next);
  if (!results) {
    return; // Error already handled by service
  }

  httpResponse(req, res, 200, SEARCH_MESSAGES.AGGREGATION_SUCCESS, results);
});

/**
 * N-gram search endpoint for partial matching and typo tolerance
 * @route POST /api/v1/search/ngram
 */
export const ngramSearch = catchAsync(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateNgramSearchRequest, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const results = await searchService.performNgramSearch(value, req, next);
  if (!results) {
    return; // Error already handled by service
  }

  httpResponse(req, res, 200, SEARCH_MESSAGES.NGRAM_SEARCH_SUCCESS, results);
});

/**
 * Fuzzy search endpoint for advanced typo tolerance
 * @route POST /api/v1/search/fuzzy
 */
export const fuzzySearch = catchAsync(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateFuzzySearchRequest, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const results = await searchService.performFuzzySearch(value, req, next);
  if (!results) {
    return; // Error already handled by service
  }

  httpResponse(req, res, 200, SEARCH_MESSAGES.FUZZY_SEARCH_SUCCESS, results);
});

// Document Management Endpoints

/**
 * Index single document endpoint for data ingestion
 * @route POST /api/v1/search/index
 */
export const indexDocument = catchAsync(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateIndexDocumentRequest, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await searchService.indexDocument(value, req, next);
  if (!result) {
    return; // Error already handled by service
  }

  httpResponse(req, res, 201, SEARCH_MESSAGES.INDEX_SUCCESS, result);
});

/**
 * Bulk index documents endpoint for efficient data ingestion
 * @route POST /api/v1/search/bulk
 */
export const bulkIndex = catchAsync(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateBulkIndexRequest, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await searchService.bulkIndexDocuments(value, req, next);
  if (!result) {
    return; // Error already handled by service
  }

  httpResponse(req, res, 201, SEARCH_MESSAGES.BULK_INDEX_SUCCESS, result);
});

/**
 * Update document endpoint
 * @route PUT /api/v1/search/document/:id
 */
export const updateDocument = catchAsync(async (req, res, next) => {
  const requestData = {
    ...req.body,
    id: req.params.id
  };

  const { error, value } = validateJoiSchema(validateUpdateDocumentRequest, requestData);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await searchService.updateDocument(value, req, next);
  if (!result) {
    return; // Error already handled by service
  }

  httpResponse(req, res, 200, SEARCH_MESSAGES.DOCUMENT_UPDATED, result);
});

/**
 * Delete document endpoint
 * @route DELETE /api/v1/search/document/:id
 */
export const deleteDocument = catchAsync(async (req, res, next) => {
  const requestData = {
    id: req.params.id,
    index: req.query.index || req.body.index
  };

  const { error, value } = validateJoiSchema(validateDeleteDocumentRequest, requestData);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await searchService.deleteDocument(value, req, next);
  if (!result) {
    return; // Error already handled by service
  }

  httpResponse(req, res, 200, SEARCH_MESSAGES.DOCUMENT_DELETED, result);
});

// Index Management Endpoints

/**
 * Create search index endpoint
 * @route POST /api/v1/search/index/create
 */
export const createIndex = catchAsync(async (req, res, next) => {
  const requestData = {
    name: req.body.index || req.body.name,
    mapping: req.body.mappings || req.body.mapping,
    settings: req.body.settings,
    aliases: req.body.aliases
  };

  const { error, value } = validateJoiSchema(validateCreateIndexRequest, requestData);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await searchService.createSearchIndex(value, req, next);
  if (!result) {
    return; // Error already handled by service
  }

  httpResponse(req, res, 201, SEARCH_MESSAGES.INDEX_CREATED, result);
});

/**
 * Delete search index endpoint
 * @route DELETE /api/v1/search/index/:indexName
 */
export const deleteIndex = catchAsync(async (req, res, next) => {
  const requestData = {
    index: req.params.indexName
  };

  const { error, value } = validateJoiSchema(validateDeleteIndexRequest, requestData);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await searchService.deleteSearchIndex(value, req, next);
  if (!result) {
    return; // Error already handled by service
  }

  httpResponse(req, res, 200, SEARCH_MESSAGES.INDEX_DELETED, result);
});

// Pipeline Management Endpoints

/**
 * Create ingest pipeline endpoint
 * @route POST /api/v1/search/pipeline
 */
export const createPipeline = catchAsync(async (req, res, next) => {
  const requestData = {
    name: req.body.id || req.body.name,
    processors: req.body.processors,
    description: req.body.description,
    onFailure: req.body.on_failure || req.body.onFailure,
    version: req.body.version,
    meta: req.body.meta
  };

  const { error, value } = validateJoiSchema(validateCreatePipelineRequest, requestData);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await searchService.createIngestPipeline(value, req, next);
  if (!result) {
    return; // Error already handled by service
  }

  httpResponse(req, res, 201, SEARCH_MESSAGES.PIPELINE_CREATED, result);
});

/**
 * Update ingest pipeline endpoint
 * @route PUT /api/v1/search/pipeline/:pipelineId
 */
export const updatePipeline = catchAsync(async (req, res, next) => {
  const requestData = {
    id: req.params.pipelineId,
    processors: req.body.processors,
    description: req.body.description,
    onFailure: req.body.on_failure || req.body.onFailure,
    version: req.body.version,
    meta: req.body.meta
  };

  const { error, value } = validateJoiSchema(validateUpdatePipelineRequest, requestData);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await searchService.updateIngestPipeline(value, req, next);
  if (!result) {
    return; // Error already handled by service
  }

  httpResponse(req, res, 200, SEARCH_MESSAGES.PIPELINE_CREATED, result);
});

/**
 * Delete ingest pipeline endpoint
 * @route DELETE /api/v1/search/pipeline/:pipelineId
 */
export const deletePipeline = catchAsync(async (req, res, next) => {
  const requestData = {
    id: req.params.pipelineId
  };

  const { error, value } = validateJoiSchema(validateDeletePipelineRequest, requestData);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await searchService.deleteIngestPipeline(value, req, next);
  if (!result) {
    return; // Error already handled by service
  }

  httpResponse(req, res, 200, SEARCH_MESSAGES.PIPELINE_DELETED, result);
});

/**
 * Get pipeline information endpoint
 * @route GET /api/v1/search/pipeline/:pipelineId
 */
export const getPipeline = catchAsync(async (req, res, next) => {
  const { pipelineId } = req.params.pipelineId;

  if (!pipelineId) {
    return httpError(next, new Error('Pipeline ID is required'), req, 400);
  }

  const result = await searchService.getPipelineInfo(pipelineId, req, next);
  if (!result) {
    return; // Error already handled by service
  }

  httpResponse(req, res, 200, 'Pipeline information retrieved successfully', result);
});

// Health and Statistics Endpoints

/**
 * Get search statistics endpoint
 * @route GET /api/v1/search/stats/:indexName?
 */
export const getSearchStats = catchAsync(async (req, res, next) => {
  const indexName = req.params.indexName || req.query.index;

  const result = await searchService.getSearchStats(indexName, req, next);
  if (!result) {
    return; // Error already handled by service
  }

  httpResponse(req, res, 200, 'Search statistics retrieved successfully', result);
});

/**
 * Health check endpoint for search functionality
 * @route GET /api/v1/search/health
 */
export const searchHealthCheck = catchAsync(async (req, res, next) => {
  const result = await searchService.checkSearchHealth(req, next);
  if (!result) {
    return; // Error already handled by service
  }

  httpResponse(req, res, 200, 'Search system is healthy', result);
});

// Export all controller functions
export default {
  // Core search endpoints
  search,
  semanticSearch,
  knnSearch,
  ngramSearch,
  fuzzySearch,
  aggregateSearch,

  // Document management endpoints
  indexDocument,
  bulkIndex,
  updateDocument,
  deleteDocument,

  // Index management endpoints
  createIndex,
  deleteIndex,

  // Pipeline management endpoints
  createPipeline,
  updatePipeline,
  deletePipeline,
  getPipeline,

  // Health and statistics endpoints
  getSearchStats,
  searchHealthCheck
};
