import { catchAsync } from '../utils/catchAsync.js';
import { httpError } from '../utils/httpError.js';
import { logger } from '../utils/logger.js';
import { SEARCH_ERROR_CODES } from '../constants/searchConstants.js';
import * as searchRepository from '../repository/searchRepository.js';
import * as embeddingService from './embeddingService.js';
import * as pipelineService from './pipelineService.js';

/**
 * Search Service Layer
 * Handles business logic and orchestration for search operations
 */

// Core Search Functions

/**
 * Perform multi-field search with advanced features
 * @param {Object} searchParams - Search parameters
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Formatted search results
 */
export const performSearch = catchAsync(async (searchParams, req, next) => {
  try {
    // Validate required parameters
    if (!searchParams.index) {
      logger.error('Index name is required for search', { searchParams });
      return httpError(next, new Error('Index name is required'), req, 400);
    }

    // Build multi-field query
    const query = searchRepository.buildMultiFieldQuery(searchParams);

    // Execute search
    const results = await searchRepository.executeSearch(query, searchParams.index, req, next);

    if (!results) {
      return null; // Error already handled by repository
    }

    // Format and return results
    const formattedResults = formatSearchResults(results, searchParams);

    logger.info('Multi-field search completed successfully', {
      index: searchParams.index,
      query: searchParams.query,
      totalHits: results.hits.total.value,
      took: results.took
    });

    return formattedResults;
  } catch (error) {
    logger.error('Multi-field search operation failed', {
      error: error.message,
      searchParams,
      stack: error.stack
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.INVALID_QUERY), req, 400);
  }
});

/**
 * Perform semantic search using vector embeddings
 * @param {Object} searchParams - Semantic search parameters
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Formatted semantic search results
 */
export const performSemanticSearch = catchAsync(async (searchParams, req, next) => {
  try {
    // Validate required parameters
    if (!searchParams.index) {
      logger.error('Index name is required for semantic search', { searchParams });
      return httpError(next, new Error('Index name is required'), req, 400);
    }

    if (!searchParams.query) {
      logger.error('Query text is required for semantic search', { searchParams });
      return httpError(next, new Error('Query text is required'), req, 400);
    }

    // Generate embedding for the query text
    const embedding = await embeddingService.generateEmbedding(
      searchParams.query,
      searchParams.model,
      req,
      next
    );

    if (!embedding) {
      return null; // Error already handled by embedding service
    }

    // Build semantic query with vector similarity
    const query = searchRepository.buildSemanticQuery(embedding, {
      filters: searchParams.filters,
      threshold: searchParams.threshold,
      hybridMode: searchParams.hybridMode,
      pagination: searchParams.pagination,
      textQuery: searchParams.hybridMode ? searchParams.query : null,
      fields: searchParams.fields
    });

    // Execute semantic search
    const results = await searchRepository.executeSearch(query, searchParams.index, req, next);

    if (!results) {
      return null; // Error already handled by repository
    }

    // Format and return results
    const formattedResults = formatSemanticSearchResults(results, searchParams);

    logger.info('Semantic search completed successfully', {
      index: searchParams.index,
      query: searchParams.query,
      hybridMode: searchParams.hybridMode,
      totalHits: results.hits.total.value,
      took: results.took
    });

    return formattedResults;
  } catch (error) {
    logger.error('Semantic search operation failed', {
      error: error.message,
      searchParams,
      stack: error.stack
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.EMBEDDING_FAILED), req, 500);
  }
});

/**
 * Perform KNN (K-Nearest Neighbors) search for similarity matching
 * @param {Object} searchParams - KNN search parameters
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Formatted KNN search results
 */
export const performKNNSearch = catchAsync(async (searchParams, req, next) => {
  try {
    // Validate required parameters
    if (!searchParams.index) {
      logger.error('Index name is required for KNN search', { searchParams });
      return httpError(next, new Error('Index name is required'), req, 400);
    }

    if (!searchParams.vector && !searchParams.query) {
      logger.error('Either vector or query text is required for KNN search', { searchParams });
      return httpError(next, new Error('Either vector or query text is required'), req, 400);
    }

    if (!searchParams.k || searchParams.k <= 0) {
      logger.error('Valid k value is required for KNN search', { searchParams });
      return httpError(next, new Error('Valid k value (> 0) is required'), req, 400);
    }

    let queryVector = searchParams.vector;

    // Generate embedding if query text is provided instead of vector
    if (!queryVector && searchParams.query) {
      queryVector = await embeddingService.generateEmbedding(
        searchParams.query,
        searchParams.model,
        req,
        next
      );

      if (!queryVector) {
        return null; // Error already handled by embedding service
      }
    }

    // Build KNN query
    const knnQuery = searchRepository.buildKNNQuery(queryVector, searchParams.k, {
      filters: searchParams.filters,
      similarityMetric: searchParams.similarityMetric,
      preFilter: searchParams.preFilter,
      postFilter: searchParams.postFilter,
      field: searchParams.field || 'embedding'
    });

    // Execute KNN search
    const results = await searchRepository.executeKNNSearch(
      knnQuery,
      searchParams.index,
      req,
      next
    );

    if (!results) {
      return null; // Error already handled by repository
    }

    // Format and return results
    const formattedResults = formatKNNResults(results, searchParams);

    logger.info('KNN search completed successfully', {
      index: searchParams.index,
      k: searchParams.k,
      similarityMetric: searchParams.similarityMetric,
      totalHits: results.hits.total.value,
      took: results.took
    });

    return formattedResults;
  } catch (error) {
    logger.error('KNN search operation failed', {
      error: error.message,
      searchParams,
      stack: error.stack
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.KNN_ERROR), req, 400);
  }
});

/**
 * Perform n-gram search for partial matching and typo tolerance
 * @param {Object} searchParams - N-gram search parameters
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Formatted n-gram search results
 */
export const performNgramSearch = catchAsync(async (searchParams, req, next) => {
  try {
    // Validate required parameters
    if (!searchParams.index) {
      logger.error('Index name is required for n-gram search', { searchParams });
      return httpError(next, new Error('Index name is required'), req, 400);
    }

    if (!searchParams.query) {
      logger.error('Query text is required for n-gram search', { searchParams });
      return httpError(next, new Error('Query text is required'), req, 400);
    }

    // Build n-gram query
    const query = searchRepository.buildNgramQuery({
      query: searchParams.query,
      fields: searchParams.fields,
      filters: searchParams.filters,
      pagination: searchParams.pagination,
      ngramType: searchParams.ngramType || 'both',
      minScore: searchParams.minScore || 0.1
    });

    // Execute n-gram search
    const results = await searchRepository.executeNgramSearch(query, searchParams.index, req, next);

    if (!results) {
      return null; // Error already handled by repository
    }

    // Format and return results
    const formattedResults = formatNgramSearchResults(results, searchParams);

    logger.info('N-gram search completed successfully', {
      index: searchParams.index,
      query: searchParams.query,
      ngramType: searchParams.ngramType,
      totalHits: results.hits.total.value,
      took: results.took
    });

    return formattedResults;
  } catch (error) {
    logger.error('N-gram search operation failed', {
      error: error.message,
      searchParams,
      stack: error.stack
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.INVALID_QUERY), req, 400);
  }
});

/**
 * Perform fuzzy search with advanced typo tolerance
 * @param {Object} searchParams - Fuzzy search parameters
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Formatted fuzzy search results
 */
export const performFuzzySearch = catchAsync(async (searchParams, req, next) => {
  try {
    // Validate required parameters
    if (!searchParams.index) {
      logger.error('Index name is required for fuzzy search', { searchParams });
      return httpError(next, new Error('Index name is required'), req, 400);
    }

    if (!searchParams.query) {
      logger.error('Query text is required for fuzzy search', { searchParams });
      return httpError(next, new Error('Query text is required'), req, 400);
    }

    // Build fuzzy query
    const query = searchRepository.buildFuzzyQuery({
      query: searchParams.query,
      fields: searchParams.fields,
      filters: searchParams.filters,
      pagination: searchParams.pagination,
      fuzziness: searchParams.fuzziness || 'AUTO',
      prefixLength: searchParams.prefixLength || 0,
      maxExpansions: searchParams.maxExpansions || 50,
      transpositions: searchParams.transpositions !== false
    });

    // Execute fuzzy search
    const results = await searchRepository.executeFuzzySearch(query, searchParams.index, req, next);

    if (!results) {
      return null; // Error already handled by repository
    }

    // Format and return results
    const formattedResults = formatFuzzySearchResults(results, searchParams);

    logger.info('Fuzzy search completed successfully', {
      index: searchParams.index,
      query: searchParams.query,
      fuzziness: searchParams.fuzziness,
      totalHits: results.hits.total.value,
      took: results.took
    });

    return formattedResults;
  } catch (error) {
    logger.error('Fuzzy search operation failed', {
      error: error.message,
      searchParams,
      stack: error.stack
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.INVALID_QUERY), req, 400);
  }
});

/**
 * Perform aggregated search for analytics operations
 * @param {Object} searchParams - Aggregation search parameters
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Formatted aggregation results
 */
export const performAggregatedSearch = catchAsync(async (searchParams, req, next) => {
  try {
    // Validate required parameters
    if (!searchParams.index) {
      logger.error('Index name is required for aggregated search', { searchParams });
      return httpError(next, new Error('Index name is required'), req, 400);
    }

    if (!searchParams.aggregations || Object.keys(searchParams.aggregations).length === 0) {
      logger.error('Aggregations configuration is required', { searchParams });
      return httpError(next, new Error('Aggregations configuration is required'), req, 400);
    }

    // Build base query (can be empty for match_all)
    const baseQuery = searchParams.query
      ? searchRepository.buildMultiFieldQuery(searchParams)
      : { query: { match_all: {} } };

    // Build aggregation query
    const aggQuery = searchRepository.buildAggregationQuery(searchParams.aggregations);

    // Execute aggregated search
    const results = await searchRepository.executeAggregation(
      baseQuery,
      aggQuery,
      searchParams.index,
      req,
      next
    );

    if (!results) {
      return null; // Error already handled by repository
    }

    // Format and return results
    const formattedResults = formatAggregationResults(results, searchParams);

    logger.info('Aggregated search completed successfully', {
      index: searchParams.index,
      aggregationsCount: Object.keys(searchParams.aggregations).length,
      totalHits: results.hits.total.value,
      took: results.took
    });

    return formattedResults;
  } catch (error) {
    logger.error('Aggregated search operation failed', {
      error: error.message,
      searchParams,
      stack: error.stack
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.AGGREGATION_ERROR), req, 400);
  }
});

// Helper Functions for Result Formatting

/**
 * Format standard search results
 * @param {Object} results - Raw Elasticsearch results
 * @param {Object} params - Search parameters
 * @returns {Object} Formatted search results
 */
const formatSearchResults = (results, params) => {
  const pagination = calculatePagination(results.hits.total.value, params);

  return {
    hits: results.hits.hits.map((hit) => ({
      id: hit._id,
      score: hit._score,
      source: hit._source,
      highlight: hit.highlight || null
    })),
    total: {
      value: results.hits.total.value,
      relation: results.hits.total.relation
    },
    pagination,
    aggregations: results.aggregations || null,
    took: results.took,
    maxScore: results.hits.max_score
  };
};

/**
 * Format semantic search results
 * @param {Object} results - Raw Elasticsearch results
 * @param {Object} params - Search parameters
 * @returns {Object} Formatted semantic search results
 */
const formatSemanticSearchResults = (results, params) => {
  const pagination = calculatePagination(results.hits.total.value, params);

  return {
    hits: results.hits.hits.map((hit) => ({
      id: hit._id,
      score: hit._score,
      source: hit._source,
      semanticScore: hit._score, // In semantic search, score represents similarity
      highlight: hit.highlight || null
    })),
    total: {
      value: results.hits.total.value,
      relation: results.hits.total.relation
    },
    pagination,
    searchType: 'semantic',
    hybridMode: params.hybridMode || false,
    threshold: params.threshold,
    took: results.took,
    maxScore: results.hits.max_score
  };
};

/**
 * Format KNN search results
 * @param {Object} results - Raw Elasticsearch results
 * @param {Object} params - Search parameters
 * @returns {Object} Formatted KNN results
 */
const formatKNNResults = (results, params) => ({
  hits: results.hits.hits.map((hit) => ({
    id: hit._id,
    score: hit._score,
    source: hit._source,
    similarityScore: hit._score,
    rank: results.hits.hits.indexOf(hit) + 1
  })),
  total: {
    value: results.hits.total.value,
    relation: results.hits.total.relation
  },
  k: params.k,
  similarityMetric: params.similarityMetric || 'cosine',
  searchType: 'knn',
  took: results.took,
  maxScore: results.hits.max_score
});

/**
 * Format aggregation results
 * @param {Object} results - Raw Elasticsearch results
 * @param {Object} params - Search parameters
 * @returns {Object} Formatted aggregation results
 */
const formatAggregationResults = (results, params) => {
  const pagination = calculatePagination(results.hits.total.value, params);

  return {
    hits: results.hits.hits.map((hit) => ({
      id: hit._id,
      score: hit._score,
      source: hit._source
    })),
    total: {
      value: results.hits.total.value,
      relation: results.hits.total.relation
    },
    pagination,
    aggregations: formatAggregations(results.aggregations),
    searchType: 'aggregated',
    took: results.took,
    maxScore: results.hits.max_score
  };
};

/**
 * Format n-gram search results
 * @param {Object} results - Raw Elasticsearch results
 * @param {Object} params - Search parameters
 * @returns {Object} Formatted n-gram search results
 */
const formatNgramSearchResults = (results, params) => {
  const pagination = calculatePagination(results.hits.total.value, params);

  return {
    hits: results.hits.hits.map((hit) => ({
      id: hit._id,
      score: hit._score,
      source: hit._source,
      partialMatchScore: hit._score,
      highlight: hit.highlight || null
    })),
    total: {
      value: results.hits.total.value,
      relation: results.hits.total.relation
    },
    pagination,
    searchType: 'ngram',
    ngramType: params.ngramType || 'both',
    minScore: params.minScore || 0.1,
    took: results.took,
    maxScore: results.hits.max_score
  };
};

/**
 * Format fuzzy search results
 * @param {Object} results - Raw Elasticsearch results
 * @param {Object} params - Search parameters
 * @returns {Object} Formatted fuzzy search results
 */
const formatFuzzySearchResults = (results, params) => {
  const pagination = calculatePagination(results.hits.total.value, params);

  return {
    hits: results.hits.hits.map((hit) => ({
      id: hit._id,
      score: hit._score,
      source: hit._source,
      fuzzyScore: hit._score,
      typoTolerance: true,
      highlight: hit.highlight || null
    })),
    total: {
      value: results.hits.total.value,
      relation: results.hits.total.relation
    },
    pagination,
    searchType: 'fuzzy',
    fuzziness: params.fuzziness || 'AUTO',
    prefixLength: params.prefixLength || 0,
    maxExpansions: params.maxExpansions || 50,
    took: results.took,
    maxScore: results.hits.max_score
  };
};

/**
 * Format aggregation buckets and metrics
 * @param {Object} aggregations - Raw aggregation results
 * @returns {Object} Formatted aggregations
 */
const formatAggregations = (aggregations) => {
  if (!aggregations) {
    return null;
  }

  const formatted = {};

  Object.entries(aggregations).forEach(([name, agg]) => {
    if (agg.buckets) {
      // Terms, date_histogram, range aggregations
      formatted[name] = {
        buckets: agg.buckets.map((bucket) => ({
          key: bucket.key,
          keyAsString: bucket.key_as_string || bucket.key,
          docCount: bucket.doc_count,
          // Include nested aggregations if present
          ...Object.fromEntries(
            Object.entries(bucket)
              .filter(([key]) => !['key', 'key_as_string', 'doc_count'].includes(key))
              .map(([key, value]) => [key, formatAggregations({ [key]: value })[key]])
          )
        })),
        docCountErrorUpperBound: agg.doc_count_error_upper_bound,
        sumOtherDocCount: agg.sum_other_doc_count
      };
    } else if (agg.value !== undefined) {
      // Metric aggregations (avg, sum, min, max, cardinality)
      formatted[name] = {
        value: agg.value,
        valueAsString: agg.value_as_string || agg.value
      };
    } else if (agg.count !== undefined) {
      // Stats aggregation
      formatted[name] = {
        count: agg.count,
        min: agg.min,
        max: agg.max,
        avg: agg.avg,
        sum: agg.sum
      };
    } else {
      // Other aggregation types
      formatted[name] = agg;
    }
  });

  return formatted;
};

/**
 * Calculate pagination metadata
 * @param {number} total - Total number of results
 * @param {Object} params - Search parameters
 * @returns {Object} Pagination metadata
 */
const calculatePagination = (total, params) => {
  const page = params.pagination?.page || 1;
  const limit = params.pagination?.limit || 20;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  return {
    page,
    limit,
    offset,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
    isFirstPage: page === 1,
    isLastPage: page === totalPages
  };
};

// Document Management Functions

/**
 * Index a single document with pipeline processing integration
 * @param {Object} documentData - Document data with metadata
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Indexing result
 */
export const indexDocument = catchAsync(async (documentData, req, next) => {
  try {
    // Validate required parameters
    if (!documentData.index) {
      logger.error('Index name is required for document indexing', { documentData });
      return httpError(next, new Error('Index name is required'), req, 400);
    }

    if (!documentData.document || typeof documentData.document !== 'object') {
      logger.error('Document data is required and must be an object', { documentData });
      return httpError(
        next,
        new Error('Document data is required and must be an object'),
        req,
        400
      );
    }

    let processedDoc = documentData.document;

    // Process document through pipeline if specified
    if (documentData.pipeline) {
      processedDoc = await pipelineService.processDocument(
        documentData.document,
        documentData.pipeline,
        req,
        next
      );

      if (!processedDoc) {
        return null; // Error already handled by pipeline service
      }
    }

    // Generate embeddings if content field is present and no embedding exists
    if (
      processedDoc.content &&
      !processedDoc.embedding &&
      documentData.generateEmbedding !== false
    ) {
      try {
        const embedding = await embeddingService.generateEmbedding(
          processedDoc.content,
          documentData.embeddingModel,
          req,
          next
        );

        if (embedding) {
          processedDoc.embedding = embedding;
          logger.info('Embedding generated for document', {
            index: documentData.index,
            contentLength: processedDoc.content.length,
            embeddingDimensions: embedding.length
          });
        }
      } catch (error) {
        logger.warn('Failed to generate embedding for document, proceeding without it', {
          error: error.message,
          index: documentData.index
        });
      }
    }

    // Add metadata
    processedDoc.indexed_at = new Date().toISOString();
    if (documentData.metadata) {
      processedDoc.metadata = { ...processedDoc.metadata, ...documentData.metadata };
    }

    // Index the document
    const result = await searchRepository.indexDocument(
      processedDoc,
      documentData.index,
      documentData.id,
      req,
      next
    );

    if (!result) {
      return null; // Error already handled by repository
    }

    logger.info('Document indexed successfully', {
      index: documentData.index,
      id: result._id,
      pipeline: documentData.pipeline,
      hasEmbedding: Boolean(processedDoc.embedding)
    });

    return {
      id: result._id,
      index: result._index,
      version: result._version,
      result: result.result,
      pipeline: documentData.pipeline,
      hasEmbedding: Boolean(processedDoc.embedding),
      processedFields: Object.keys(processedDoc).length
    };
  } catch (error) {
    logger.error('Document indexing operation failed', {
      error: error.message,
      documentData,
      stack: error.stack
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.INDEX_OPERATION_FAILED), req, 500);
  }
});

/**
 * Bulk index multiple documents with efficient processing
 * @param {Object} bulkData - Bulk indexing data
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Bulk indexing result
 */
export const bulkIndexDocuments = catchAsync(async (bulkData, req, next) => {
  try {
    // Validate required parameters
    if (!bulkData.index) {
      logger.error('Index name is required for bulk indexing', { bulkData });
      return httpError(next, new Error('Index name is required'), req, 400);
    }

    if (
      !bulkData.documents ||
      !Array.isArray(bulkData.documents) ||
      bulkData.documents.length === 0
    ) {
      logger.error('Documents array is required and cannot be empty', { bulkData });
      return httpError(
        next,
        new Error('Documents array is required and cannot be empty'),
        req,
        400
      );
    }

    let processedDocs = bulkData.documents;

    // Process documents through pipeline if specified
    if (bulkData.pipeline) {
      const pipelineResult = await pipelineService.processBatch(
        bulkData.documents,
        bulkData.pipeline,
        req,
        next
      );

      if (!pipelineResult) {
        return null; // Error already handled by pipeline service
      }

      processedDocs = pipelineResult.processedDocuments || pipelineResult;

      if (pipelineResult.errors && pipelineResult.errors.length > 0) {
        logger.warn('Some documents failed pipeline processing', {
          pipeline: bulkData.pipeline,
          totalDocs: bulkData.documents.length,
          failedDocs: pipelineResult.errors.length
        });
      }
    }

    // Generate embeddings for documents if needed
    if (bulkData.generateEmbeddings !== false) {
      const embeddingPromises = processedDocs.map(async (doc, index) => {
        if (doc.content && !doc.embedding) {
          try {
            const embedding = await embeddingService.generateEmbedding(
              doc.content,
              bulkData.embeddingModel,
              req,
              next
            );

            if (embedding) {
              doc.embedding = embedding;
            }
          } catch (error) {
            logger.warn('Failed to generate embedding for document in batch', {
              error: error.message,
              index: bulkData.index,
              docIndex: index
            });
          }
        }
        return doc;
      });

      // Process embeddings in batches to avoid overwhelming the service
      const batchSize = 10;
      for (let i = 0; i < embeddingPromises.length; i += batchSize) {
        const batch = embeddingPromises.slice(i, i + batchSize);
        await Promise.all(batch);

        // Add small delay between batches
        if (i + batchSize < embeddingPromises.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }
    }

    // Add metadata to all documents
    const timestamp = new Date().toISOString();
    processedDocs = processedDocs.map((doc) => ({
      ...doc,
      indexed_at: timestamp,
      metadata: { ...doc.metadata, ...bulkData.metadata }
    }));

    // Perform bulk indexing
    const result = await searchRepository.bulkIndex(processedDocs, bulkData.index, req, next);

    if (!result) {
      return null; // Error already handled by repository
    }

    // Analyze results
    const successful = result.items.filter((item) => !item.index.error).length;
    const failed = result.items.filter((item) => item.index.error).length;
    const embeddingsGenerated = processedDocs.filter((doc) => doc.embedding).length;

    logger.info('Bulk indexing completed', {
      index: bulkData.index,
      totalDocs: bulkData.documents.length,
      successful,
      failed,
      embeddingsGenerated,
      pipeline: bulkData.pipeline,
      took: result.took
    });

    return {
      index: bulkData.index,
      total: bulkData.documents.length,
      successful,
      failed,
      errors:
        failed > 0
          ? result.items.filter((item) => item.index.error).map((item) => item.index.error)
          : null,
      embeddingsGenerated,
      pipeline: bulkData.pipeline,
      took: result.took
    };
  } catch (error) {
    logger.error('Bulk indexing operation failed', {
      error: error.message,
      bulkData,
      stack: error.stack
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.BULK_INDEX_FAILED), req, 500);
  }
});

// Index and Pipeline Management Service Functions

/**
 * Create a search index with proper mappings and settings
 * @param {Object} indexData - Index configuration data
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Index creation result
 */
export const createSearchIndex = catchAsync(async (indexData, req, next) => {
  try {
    // Validate required parameters
    if (!indexData.name) {
      logger.error('Index name is required', { indexData });
      return httpError(next, new Error('Index name is required'), req, 400);
    }

    // Use default mappings and settings if not provided
    const defaultMapping = {
      properties: {
        title: {
          type: 'text',
          analyzer: 'standard',
          fields: {
            keyword: { type: 'keyword' },
            ngram: { type: 'text', analyzer: 'ngram_analyzer' }
          }
        },
        content: {
          type: 'text',
          analyzer: 'standard',
          fields: {
            ngram: { type: 'text', analyzer: 'ngram_analyzer' }
          }
        },
        embedding: {
          type: 'dense_vector',
          dims: 768,
          similarity: 'cosine'
        },
        metadata: {
          type: 'object',
          properties: {
            category: { type: 'keyword' },
            tags: { type: 'keyword' },
            created_at: { type: 'date' },
            updated_at: { type: 'date' }
          }
        },
        indexed_at: { type: 'date' }
      }
    };

    const defaultSettings = {
      analysis: {
        analyzer: {
          ngram_analyzer: {
            type: 'custom',
            tokenizer: 'standard',
            filter: ['lowercase', 'ngram_filter']
          }
        },
        filter: {
          ngram_filter: {
            type: 'ngram',
            min_gram: 2,
            max_gram: 3
          }
        }
      },
      number_of_shards: 1,
      number_of_replicas: 0
    };

    const mapping = indexData.mapping || defaultMapping;
    const settings = indexData.settings || defaultSettings;

    // Create the index
    const result = await searchRepository.createIndex(indexData.name, mapping, settings, req, next);

    if (!result) {
      return null; // Error already handled by repository
    }

    logger.info('Search index created successfully', {
      indexName: indexData.name,
      acknowledged: result.acknowledged
    });

    return {
      name: indexData.name,
      acknowledged: result.acknowledged,
      mapping,
      settings
    };
  } catch (error) {
    logger.error('Index creation operation failed', {
      error: error.message,
      indexData,
      stack: error.stack
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.INDEX_CREATION_FAILED), req, 500);
  }
});

/**
 * Create an ingest pipeline for data processing
 * @param {Object} pipelineData - Pipeline configuration data
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Pipeline creation result
 */
export const createIngestPipeline = catchAsync(async (pipelineData, req, next) => {
  try {
    // Validate required parameters
    if (!pipelineData.name) {
      logger.error('Pipeline name is required', { pipelineData });
      return httpError(next, new Error('Pipeline name is required'), req, 400);
    }

    if (!pipelineData.processors || !Array.isArray(pipelineData.processors)) {
      logger.error('Processors array is required', { pipelineData });
      return httpError(next, new Error('Processors array is required'), req, 400);
    }

    // Create the pipeline
    const result = await pipelineService.createPipeline(
      pipelineData.name,
      pipelineData.processors,
      req,
      next
    );

    if (!result) {
      return null; // Error already handled by pipeline service
    }

    logger.info('Ingest pipeline created successfully', {
      pipelineName: pipelineData.name,
      processorsCount: pipelineData.processors.length
    });

    return result;
  } catch (error) {
    logger.error('Pipeline creation operation failed', {
      error: error.message,
      pipelineData,
      stack: error.stack
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.PIPELINE_CREATION_FAILED), req, 500);
  }
});

// Additional Helper Functions

/**
 * Update document with new data
 * @param {Object} updateData - Update data
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Update result
 */
export const updateDocument = catchAsync(async (updateData, req, next) => {
  try {
    if (!updateData.index || !updateData.id || !updateData.document) {
      logger.error('Index, id, and document are required for update', { updateData });
      return httpError(next, new Error('Index, id, and document are required'), req, 400);
    }

    // Add update timestamp
    const documentWithTimestamp = {
      ...updateData.document,
      updated_at: new Date().toISOString()
    };

    const result = await searchRepository.updateDocument(
      updateData.id,
      documentWithTimestamp,
      updateData.index,
      req,
      next
    );

    if (!result) {
      return null; // Error already handled by repository
    }

    logger.info('Document updated successfully', {
      index: updateData.index,
      id: updateData.id
    });

    return {
      id: result._id,
      index: result._index,
      version: result._version,
      result: result.result
    };
  } catch (error) {
    logger.error('Document update operation failed', {
      error: error.message,
      updateData,
      stack: error.stack
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.UPDATE_OPERATION_FAILED), req, 500);
  }
});

/**
 * Delete document by ID
 * @param {Object} deleteData - Delete data
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Delete result
 */
export const deleteDocument = catchAsync(async (deleteData, req, next) => {
  try {
    if (!deleteData.index || !deleteData.id) {
      logger.error('Index and id are required for deletion', { deleteData });
      return httpError(next, new Error('Index and id are required'), req, 400);
    }

    const result = await searchRepository.deleteDocument(
      deleteData.id,
      deleteData.index,
      req,
      next
    );

    if (!result) {
      return null; // Error already handled by repository
    }

    logger.info('Document deleted successfully', {
      index: deleteData.index,
      id: deleteData.id
    });

    return {
      id: result._id,
      index: result._index,
      version: result._version,
      result: result.result
    };
  } catch (error) {
    logger.error('Document deletion operation failed', {
      error: error.message,
      deleteData,
      stack: error.stack
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.DELETE_OPERATION_FAILED), req, 500);
  }
});

/**
 * Get search statistics and health information
 * @param {string} indexName - Index name
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Search statistics
 */
export const getSearchStats = catchAsync(async (indexName, req, next) => {
  try {
    // This would typically call Elasticsearch stats APIs
    // For now, return basic structure
    logger.info('Search statistics requested', { indexName });

    return {
      index: indexName,
      status: 'healthy',
      documentCount: 0,
      indexSize: '0b',
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Failed to get search statistics', {
      error: error.message,
      indexName,
      stack: error.stack
    });
    return httpError(next, new Error('Failed to get search statistics'), req, 500);
  }
});
/**
 * Delete a search index
 * @param {Object} deleteData - Index deletion data
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Index deletion result
 */
export const deleteSearchIndex = catchAsync(async (deleteData, req, next) => {
  try {
    if (!deleteData.index) {
      logger.error('Index name is required for deletion', { deleteData });
      return httpError(next, new Error('Index name is required'), req, 400);
    }

    const result = await searchRepository.deleteIndex(deleteData.index, req, next);

    if (!result) {
      return null; // Error already handled by repository
    }

    logger.info('Search index deleted successfully', {
      indexName: deleteData.index,
      acknowledged: result.acknowledged
    });

    return {
      index: deleteData.index,
      acknowledged: result.acknowledged
    };
  } catch (error) {
    logger.error('Index deletion operation failed', {
      error: error.message,
      deleteData,
      stack: error.stack
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.INDEX_DELETION_FAILED), req, 500);
  }
});

/**
 * Update an ingest pipeline
 * @param {Object} pipelineData - Pipeline update data
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Pipeline update result
 */
export const updateIngestPipeline = catchAsync(async (pipelineData, req, next) => {
  try {
    if (!pipelineData.id) {
      logger.error('Pipeline ID is required for update', { pipelineData });
      return httpError(next, new Error('Pipeline ID is required'), req, 400);
    }

    if (!pipelineData.processors || !Array.isArray(pipelineData.processors)) {
      logger.error('Processors array is required', { pipelineData });
      return httpError(next, new Error('Processors array is required'), req, 400);
    }

    const result = await pipelineService.updatePipeline(
      pipelineData.id,
      pipelineData.processors,
      req,
      next
    );

    if (!result) {
      return null; // Error already handled by pipeline service
    }

    logger.info('Ingest pipeline updated successfully', {
      pipelineId: pipelineData.id,
      processorsCount: pipelineData.processors.length
    });

    return result;
  } catch (error) {
    logger.error('Pipeline update operation failed', {
      error: error.message,
      pipelineData,
      stack: error.stack
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.PIPELINE_ERROR), req, 500);
  }
});

/**
 * Delete an ingest pipeline
 * @param {Object} pipelineData - Pipeline deletion data
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Pipeline deletion result
 */
export const deleteIngestPipeline = catchAsync(async (pipelineData, req, next) => {
  try {
    if (!pipelineData.id) {
      logger.error('Pipeline ID is required for deletion', { pipelineData });
      return httpError(next, new Error('Pipeline ID is required'), req, 400);
    }

    const result = await pipelineService.deletePipeline(pipelineData.id, req, next);

    if (!result) {
      return null; // Error already handled by pipeline service
    }

    logger.info('Ingest pipeline deleted successfully', {
      pipelineId: pipelineData.id,
      acknowledged: result.acknowledged
    });

    return {
      id: pipelineData.id,
      acknowledged: result.acknowledged
    };
  } catch (error) {
    logger.error('Pipeline deletion operation failed', {
      error: error.message,
      pipelineData,
      stack: error.stack
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.PIPELINE_ERROR), req, 500);
  }
});

/**
 * Get pipeline information
 * @param {string} pipelineId - Pipeline ID
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Pipeline information
 */
export const getPipelineInfo = catchAsync(async (pipelineId, req, next) => {
  try {
    if (!pipelineId) {
      logger.error('Pipeline ID is required', { pipelineId });
      return httpError(next, new Error('Pipeline ID is required'), req, 400);
    }

    const result = await pipelineService.getPipeline(pipelineId, req, next);

    if (!result) {
      return null; // Error already handled by pipeline service
    }

    logger.info('Pipeline information retrieved successfully', { pipelineId });

    return result;
  } catch (error) {
    logger.error('Pipeline info retrieval failed', {
      error: error.message,
      pipelineId,
      stack: error.stack
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.PIPELINE_ERROR), req, 500);
  }
});

/**
 * Check search system health
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Health check result
 */
export const checkSearchHealth = catchAsync(async (req, next) => {
  try {
    // Check Elasticsearch connection
    const esHealth = await searchRepository.checkElasticsearchHealth(req, next);

    if (!esHealth) {
      return null; // Error already handled by repository
    }

    const healthStatus = {
      elasticsearch: {
        status: esHealth.status || 'unknown',
        cluster_name: esHealth.cluster_name,
        number_of_nodes: esHealth.number_of_nodes,
        active_primary_shards: esHealth.active_primary_shards,
        active_shards: esHealth.active_shards,
        timestamp: new Date().toISOString()
      },
      services: {
        search: 'healthy',
        embedding: 'healthy',
        pipeline: 'healthy'
      },
      version: '1.0.0'
    };

    logger.info('Search health check completed', { status: healthStatus.elasticsearch.status });

    return healthStatus;
  } catch (error) {
    logger.error('Search health check failed', {
      error: error.message,
      stack: error.stack
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.ELASTICSEARCH_CONNECTION_ERROR), req, 500);
  }
});
