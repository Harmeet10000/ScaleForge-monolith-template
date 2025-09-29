import { httpResponse } from '../../utils/httpResponse.js';
import { httpError } from '../../utils/httpError.js';
import asyncHandler from 'express-async-handler';
import {
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
} from './searchValidation.js';
import { validateJoiSchema } from '../../helpers/generalHelper.js';
import * as searchService from './searchService.js';
import { SEARCH_MESSAGES } from './searchConstants.js';

export const search = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateSearchRequest, req.query);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const results = await searchService.performSearch(value, req, next);

  httpResponse(req, res, 200, SEARCH_MESSAGES.SEARCH_SUCCESS, results);
});

export const semanticSearch = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateSemanticSearchRequest, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const results = await searchService.performSemanticSearch(value, req, next);

  httpResponse(req, res, 200, SEARCH_MESSAGES.SEMANTIC_SEARCH_SUCCESS, results);
});

export const knnSearch = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateKNNSearchRequest, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const results = await searchService.performKNNSearch(value, req, next);

  httpResponse(req, res, 200, SEARCH_MESSAGES.KNN_SEARCH_SUCCESS, results);
});

export const aggregateSearch = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateAggregationRequest, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const results = await searchService.performAggregatedSearch(value, req, next);

  httpResponse(req, res, 200, SEARCH_MESSAGES.AGGREGATION_SUCCESS, results);
});

export const ngramSearch = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateNgramSearchRequest, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const results = await searchService.performNgramSearch(value, req, next);

  httpResponse(req, res, 200, SEARCH_MESSAGES.NGRAM_SEARCH_SUCCESS, results);
});

export const fuzzySearch = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateFuzzySearchRequest, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const results = await searchService.performFuzzySearch(value, req, next);

  httpResponse(req, res, 200, SEARCH_MESSAGES.FUZZY_SEARCH_SUCCESS, results);
});

// Document Management Endpoints

export const indexDocument = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateIndexDocumentRequest, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await searchService.indexDocument(value, req, next);

  httpResponse(req, res, 201, SEARCH_MESSAGES.INDEX_SUCCESS, result);
});

export const bulkIndex = asyncHandler(async (req, res, next) => {
  const { error, value } = validateJoiSchema(validateBulkIndexRequest, req.body);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await searchService.bulkIndexDocuments(value, req, next);

  httpResponse(req, res, 201, SEARCH_MESSAGES.BULK_INDEX_SUCCESS, result);
});

export const updateDocument = asyncHandler(async (req, res, next) => {
  const requestData = {
    ...req.body,
    id: req.params.id
  };

  const { error, value } = validateJoiSchema(validateUpdateDocumentRequest, requestData);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await searchService.updateDocument(value, req, next);

  httpResponse(req, res, 200, SEARCH_MESSAGES.DOCUMENT_UPDATED, result);
});

export const deleteDocument = asyncHandler(async (req, res, next) => {
  const requestData = {
    id: req.params.id,
    index: req.query.index || req.body.index
  };

  const { error, value } = validateJoiSchema(validateDeleteDocumentRequest, requestData);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await searchService.deleteDocument(value, req, next);

  httpResponse(req, res, 200, SEARCH_MESSAGES.DOCUMENT_DELETED, result);
});

// Index Management Endpoints

export const createIndex = asyncHandler(async (req, res, next) => {
  const requestData = {
    name: req.body.name,
    mappings: req.body.mappings,
    settings: req.body.settings,
    aliases: req.body.aliases
  };

  const { error, value } = validateJoiSchema(validateCreateIndexRequest, requestData);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await searchService.createSearchIndex(value, req, next);

  httpResponse(req, res, 201, SEARCH_MESSAGES.INDEX_CREATED, result);
});

export const deleteIndex = asyncHandler(async (req, res, next) => {
  const requestData = {
    index: req.params.indexName
  };

  const { error, value } = validateJoiSchema(validateDeleteIndexRequest, requestData);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await searchService.deleteSearchIndex(value, req, next);

  httpResponse(req, res, 200, SEARCH_MESSAGES.INDEX_DELETED, result);
});

// Pipeline Management Endpoints

export const createPipeline = asyncHandler(async (req, res, next) => {
  const requestData = {
    name: req.body.name,
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

  httpResponse(req, res, 201, SEARCH_MESSAGES.PIPELINE_CREATED, result);
});

export const updatePipeline = asyncHandler(async (req, res, next) => {
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

  httpResponse(req, res, 200, SEARCH_MESSAGES.PIPELINE_CREATED, result);
});

export const deletePipeline = asyncHandler(async (req, res, next) => {
  const requestData = {
    id: req.params.pipelineId
  };

  const { error, value } = validateJoiSchema(validateDeletePipelineRequest, requestData);
  if (error) {
    return httpError(next, error, req, 422);
  }

  const result = await searchService.deleteIngestPipeline(value, req, next);

  httpResponse(req, res, 200, SEARCH_MESSAGES.PIPELINE_DELETED, result);
});

export const getPipeline = asyncHandler(async (req, res, next) => {
  const { pipelineId } = req.params;

  if (!pipelineId) {
    return httpError(next, new Error('Pipeline ID is required'), req, 400);
  }

  const result = await searchService.getPipelineInfo(pipelineId, req, next);

  httpResponse(req, res, 200, 'Pipeline information retrieved successfully', result);
});

// Health and Statistics Endpoints

export const searchHealthCheck = asyncHandler(async (req, res, next) => {
  const result = await searchService.checkSearchHealth(req, next);

  httpResponse(req, res, 200, 'Search system is healthy', result);
});
