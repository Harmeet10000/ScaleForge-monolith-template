import asyncHandler from 'express-async-handler';
// import { httpError } from '../utils/httpError.js';
// import { SEARCH_ERROR_CODES } from '../constants/searchConstants.js';
import { logger } from '../../utils/logger.js';
import * as searchRepository from './searchRepository.js';
import * as searchQueryBuilder from './searchQueryBuilders.js';
import * as embeddingService from './embeddingService.js';
import * as pipelineService from './pipelineService.js';

/**
 * Search Service Layer
 * Handles business logic and orchestration for search operations
 */

// Core Search Functions

export const performSearch = asyncHandler(async (searchParams) => {
  // Build multi-field query
  const query = searchQueryBuilder.buildMultiFieldQuery(searchParams);

  // Execute search
  const results = await searchRepository.executeSearch(query, searchParams.index);
  // logger.debug('results', { meta: { results } });
  // Format and return results
  const formattedResults = formatSearchResults(results, searchParams);

  logger.info('Multi-field search completed successfully', {
    meta: {
      index: searchParams.index,
      query: searchParams.query,
      totalHits: results.hits.total.value,
      took: results.took
    }
  });

  return formattedResults;
});

export const performSemanticSearch = asyncHandler(async (searchParams) => {
  // Generate embedding for the query text
  const embedding = await embeddingService.generateEmbedding(
    searchParams.query,
    searchParams.model
  );

  // Build semantic query with vector similarity
  const query = searchQueryBuilder.buildSemanticQuery(embedding, {
    filters: searchParams.filters,
    threshold: searchParams.threshold,
    hybridMode: searchParams.hybridMode,
    pagination: searchParams.pagination,
    textQuery: searchParams.hybridMode ? searchParams.query : null,
    fields: searchParams.fields
  });

  // logger.debug('Semantic Query', { meta: { query } });
  // Execute semantic search
  const results = await searchRepository.executeSearch(query, searchParams.index);

  // Format and return results
  const formattedResults = formatSemanticSearchResults(results, searchParams);

  logger.info('Semantic search completed successfully', {
    meta: {
      index: searchParams.index,
      query: searchParams.query,
      hybridMode: searchParams.hybridMode,
      totalHits: results.hits.total.value,
      took: results.took
    }
  });

  return formattedResults;
});

export const performKNNSearch = asyncHandler(async (searchParams) => {
  let queryVector = searchParams.vector;

  // Generate embedding if query text is provided instead of vector
  if (!queryVector && searchParams.query) {
    queryVector = await embeddingService.generateEmbedding(searchParams.query, searchParams.model);
  }

  // Build KNN query
  const knnQuery = searchQueryBuilder.buildKNNQuery(queryVector, searchParams.k, {
    filters: searchParams.filters,
    similarityMetric: searchParams.similarityMetric,
    preFilter: searchParams.preFilter,
    postFilter: searchParams.postFilter,
    field: searchParams.field || 'embedding'
  });

  // Execute KNN search
  const results = await searchRepository.executeKNNSearch(knnQuery, searchParams.index);

  // Format and return results
  const formattedResults = formatKNNResults(results, searchParams);

  logger.info('KNN search completed successfully', {
    meta: {
      index: searchParams.index,
      k: searchParams.k,
      similarityMetric: searchParams.similarityMetric,
      totalHits: results.hits.total.value,
      took: results.took
    }
  });

  return formattedResults;
});

export const performNgramSearch = asyncHandler(async (searchParams) => {
  // Build n-gram query
  const query = searchQueryBuilder.buildNgramQuery({
    query: searchParams.query,
    fields: searchParams.fields,
    filters: searchParams.filters,
    pagination: searchParams.pagination,
    ngramType: searchParams.ngram_type,
    minScore: searchParams.min_score
  });
  // logger.debug('query', { meta: { query } });

  // Execute n-gram search
  const results = await searchRepository.executeNgramSearch(query, searchParams.index);
  // logger.debug('results', { meta: { results } });

  // Format and return results
  const formattedResults = formatNgramSearchResults(results, searchParams);

  logger.info('N-gram search completed successfully', {
    meta: {
      index: searchParams.index,
      query: searchParams.query,
      ngramType: searchParams.ngram_type,
      totalHits: results.hits.total.value,
      took: results.took,
      formattedResults
    }
  });

  return formattedResults;
});

export const performFuzzySearch = asyncHandler(async (searchParams) => {
  // Build fuzzy query
  const query = searchQueryBuilder.buildFuzzyQuery({
    query: searchParams.query,
    fields: searchParams.fields,
    filters: searchParams.filters,
    pagination: searchParams.pagination,
    fuzziness: searchParams.fuzziness || 'AUTO',
    prefixLength: searchParams.prefixLength || 0,
    maxExpansions: searchParams.maxExpansions || 50,
    transpositions: searchParams.transpositions !== false
  });
  logger.debug('Fuzzy query', { meta: { query } });
  // Execute fuzzy search
  const results = await searchRepository.executeFuzzySearch(query, searchParams.index);

  // Format and return results
  const formattedResults = formatFuzzySearchResults(results, searchParams);

  logger.info('Fuzzy search completed successfully', {
    meta: {
      index: searchParams.index,
      query: searchParams.query,
      fuzziness: searchParams.fuzziness,
      totalHits: results.hits.total.value,
      took: results.took
    }
  });

  return formattedResults;
});

export const performAggregatedSearch = asyncHandler(async (searchParams) => {
  // Build base query (can be empty for match_all)
  const baseQuery = searchParams.query
    ? searchQueryBuilder.buildMultiFieldQuery(searchParams)
    : { query: { match_all: {} } };

  // Build aggregation query
  const aggQuery = searchQueryBuilder.buildAggregationQuery(searchParams.aggregations);

  // Execute aggregated search
  const results = await searchRepository.executeAggregation(
    baseQuery,
    aggQuery,
    searchParams.index
  );

  // Format and return results
  const formattedResults = formatAggregationResults(results, searchParams);

  logger.info('Aggregated search completed successfully', {
    meta: {
      index: searchParams.index,
      aggregationsCount: Object.keys(searchParams.aggregations).length,
      totalHits: results.hits.total.value,
      took: results.took
    }
  });

  return formattedResults;
});

// Document Management Functions

export const indexDocument = asyncHandler(async (documentData) => {
  let processedDoc = documentData.document;

  // Process document through pipeline if specified
  if (documentData.pipeline) {
    processedDoc = await pipelineService.processDocument(
      documentData.document,
      documentData.pipeline
    );
  }

  // Generate embeddings if content field is present and no embedding exists
  if (processedDoc.content && !processedDoc.embedding && documentData.generateEmbedding !== false) {
    try {
      const embedding = await embeddingService.generateEmbedding(
        processedDoc.content,
        documentData.embeddingModel
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
    documentData.id
  );

  logger.info('Document indexed successfully', {
    meta: {
      index: documentData.index,
      id: result._id,
      pipeline: documentData.pipeline,
      hasEmbedding: Boolean(processedDoc.embedding)
    }
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
});

export const bulkIndexDocuments = asyncHandler(async (bulkData) => {
  let processedDocs = bulkData.documents;

  // Process documents through pipeline if specified
  if (bulkData.pipeline) {
    // Extract source documents for pipeline processing
    const sourceDocuments = bulkData.documents.map((doc) => doc._source || doc);

    const pipelineResult = await pipelineService.processBatch(sourceDocuments, bulkData.pipeline);
    // logger.debug('pipelineResult', { meta: { pipelineResult } });
    const processedSources = pipelineResult.processedDocuments || pipelineResult;

    // Reconstruct the bulk format with processed sources
    processedDocs = bulkData.documents.map((originalDoc, index) => ({
      ...originalDoc,
      _source: processedSources[index] || originalDoc._source || originalDoc
    }));

    if (pipelineResult.errors && pipelineResult.errors.length > 0) {
      logger.warn('Some documents failed pipeline processing', {
        meta: {
          pipeline: bulkData.pipeline,
          totalDocs: bulkData.documents.length,
          failedDocs: pipelineResult.errors.length
        }
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
            bulkData.embeddingModel
          );

          if (embedding) {
            doc.embedding = embedding;
          }
        } catch (error) {
          logger.warn('Failed to generate embedding for document in batch', {
            meta: {
              error: error.message,
              index: bulkData.index,
              docIndex: index
            }
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
  const result = await searchRepository.bulkIndex(processedDocs, bulkData.index);
  // logger.debug('result', { meta: { result } });
  // Analyze results
  const successful = result.items.filter((item) => !item.index.error).length;
  const failed = result.items.filter((item) => item.index.error).length;
  const embeddingsGenerated = processedDocs.filter((doc) => doc.embedding).length;

  logger.info('Bulk indexing completed', {
    meta: {
      index: bulkData.index,
      totalDocs: bulkData.documents.length,
      successful,
      failed,
      embeddingsGenerated,
      pipeline: bulkData.pipeline,
      took: result.took
    }
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
});

// Index and Pipeline Management Service Functions

export const createSearchIndex = asyncHandler(async (indexData) => {
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
  const result = await searchRepository.createIndex(indexData.name, mapping, settings);

  logger.info('Search index created successfully', {
    meta: {
      indexName: indexData.name,
      result
    }
  });

  return {
    name: indexData.name,
    acknowledged: result?.acknowledged,
    mapping,
    settings
  };
});

export const createIngestPipeline = asyncHandler(async (pipelineData) => {
  // Create the pipeline
  const result = await pipelineService.createPipeline(pipelineData.name, pipelineData.processors);

  if (!result) {
    return null; // Error already handled by pipeline service
  }

  logger.info('Ingest pipeline created successfully', {
    meta: {
      pipelineName: pipelineData.name,
      processorsCount: pipelineData.processors.length
    }
  });

  return result;
});

// Additional Helper Functions

export const updateDocument = asyncHandler(async (updateData) => {
  // Add update timestamp
  const documentWithTimestamp = {
    ...updateData.document,
    updated_at: new Date().toISOString()
  };

  const result = await searchRepository.updateDocument(
    updateData.id,
    documentWithTimestamp,
    updateData.index
  );

  if (!result) {
    return null; // Error already handled by repository
  }

  logger.info('Document updated successfully', {
    meta: {
      index: updateData.index,
      id: updateData.id
    }
  });

  return {
    id: result._id,
    index: result._index,
    version: result._version,
    result: result.result
  };
});

export const deleteDocument = asyncHandler(async (deleteData) => {
  const result = await searchRepository.deleteDocument(deleteData.id, deleteData.index);

  logger.info('Document deleted successfully', {
    meta: {
      index: deleteData.index,
      id: deleteData.id
    }
  });

  return {
    id: result._id,
    index: result._index,
    version: result._version,
    result: result.result
  };
});

export const deleteSearchIndex = asyncHandler(async (deleteData) => {
  const result = await searchRepository.deleteIndex(deleteData.index);

  if (!result) {
    return null; // Error already handled by repository
  }

  logger.info('Search index deleted successfully', {
    meta: {
      indexName: deleteData.index,
      acknowledged: result.acknowledged
    }
  });

  return {
    index: deleteData.index,
    acknowledged: result.acknowledged
  };
});

export const updateIngestPipeline = asyncHandler(async (pipelineData) => {
  // logger.debug('pipeline', { meta: { pipelineData } });
  const result = await pipelineService.updatePipeline(pipelineData.id, pipelineData.processors);

  logger.info('Ingest pipeline updated successfully', {
    meta: {
      pipelineId: pipelineData.id,
      processorsCount: pipelineData.processors.length
    }
  });

  return result;
});

export const deleteIngestPipeline = asyncHandler(async (pipelineData) => {
  const result = await pipelineService.deletePipeline(pipelineData.id);

  if (!result) {
    return null; // Error already handled by pipeline service
  }

  logger.info('Ingest pipeline deleted successfully', {
    meta: {
      pipelineId: pipelineData.id,
      acknowledged: result.acknowledged
    }
  });

  return {
    id: pipelineData.id,
    acknowledged: result.acknowledged
  };
});

export const getPipelineInfo = asyncHandler(async (pipelineId) => {
  // logger.debug('pipeline', { meta: { pipelineId } });

  const result = await pipelineService.getPipeline(pipelineId);

  logger.info('Pipeline information retrieved successfully', { meta: { pipelineId } });

  return result;
});

export const checkSearchHealth = asyncHandler(async () => {
  // Check Elasticsearch connection
  const esHealth = await searchRepository.checkElasticsearchHealth();

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

  logger.info('Search health check completed', {
    meta: { status: healthStatus.elasticsearch.status }
  });

  return healthStatus;
});

// Helper Functions for Result Formatting

const formatSearchResults = (results, params) => {
  // logger.debug('result', { meta: { results } });
  const pagination = calculatePagination(results.hits.total.value, params);

  return {
    hits: results.hits?.hits.map((hit) => ({
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

const formatSemanticSearchResults = (results, params) => {
  const pagination = calculatePagination(results.hits.total.value, params);

  return {
    hits: results.hits?.hits.map((hit) => ({
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

const formatKNNResults = (results, params) => ({
  hits: results.hits?.hits.map((hit) => ({
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

const formatAggregationResults = (results, params) => {
  const pagination = calculatePagination(results.hits.total.value, params);

  return {
    hits: results.hits?.hits.map((hit) => ({
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

const formatNgramSearchResults = (results, params) => {
  const pagination = calculatePagination(results.hits.total.value, params);

  return {
    hits: results.hits?.hits.map((hit) => ({
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

const formatFuzzySearchResults = (results, params) => {
  const pagination = calculatePagination(results.hits.total.value, params);

  return {
    hits: results.hits?.hits.map((hit) => ({
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

const formatAggregations = (aggregations) => {
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
