import { client } from '../connections/connectElasticSearch.js';
import { catchAsync } from '../utils/catchAsync.js';
import { httpError } from '../utils/httpError.js';
import { logger } from '../utils/logger.js';
import {
  SEARCH_ERROR_CODES,
  // SEARCH_MESSAGES,
  PIPELINE_PROCESSORS
} from '../constants/searchConstants.js';

/**
 * Pipeline Service for Elasticsearch Ingest Pipelines
 * Handles pipeline management and document processing
 */

// Pipeline Management Functions

/**
 * Create a new ingest pipeline
 * @param {string} pipelineName - Name of the pipeline
 * @param {Array} processors - Array of processor configurations
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Pipeline creation response
 */
export const createPipeline = catchAsync(async (pipelineName, processors, req, next) => {
  try {
    // Validate pipeline configuration
    if (!pipelineName || typeof pipelineName !== 'string') {
      logger.error('Invalid pipeline name provided', { pipelineName });
      return httpError(next, new Error('Pipeline name is required and must be a string'), req, 400);
    }

    if (!processors || !Array.isArray(processors) || processors.length === 0) {
      logger.error('Invalid processors configuration', { processors });
      return httpError(
        next,
        new Error('Processors array is required and cannot be empty'),
        req,
        400
      );
    }

    // Check if pipeline already exists
    try {
      await client.ingest.getPipeline({ id: pipelineName });
      logger.warn('Pipeline already exists', { pipelineName });
      return httpError(next, new Error(`Pipeline '${pipelineName}' already exists`), req, 409);
    } catch (error) {
      // Pipeline doesn't exist, which is what we want
      if (error.meta?.statusCode !== 404) {
        throw error;
      }
    }

    const response = await client.ingest.putPipeline({
      id: pipelineName,
      body: {
        description: `Pipeline: ${pipelineName}`,
        processors
      }
    });

    logger.info('Pipeline created successfully', {
      pipelineName,
      processorsCount: processors.length
    });

    return {
      pipelineName,
      acknowledged: response.acknowledged,
      processorsCount: processors.length
    };
  } catch (error) {
    logger.error('Pipeline creation failed', {
      pipelineName,
      error: error.message,
      statusCode: error.meta?.statusCode
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.PIPELINE_CREATION_FAILED), req, 500);
  }
});

/**
 * Update an existing ingest pipeline
 * @param {string} pipelineName - Name of the pipeline
 * @param {Array} processors - Updated array of processor configurations
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Pipeline update response
 */
export const updatePipeline = catchAsync(async (pipelineName, processors, req, next) => {
  try {
    // Validate pipeline configuration
    if (!pipelineName || typeof pipelineName !== 'string') {
      logger.error('Invalid pipeline name provided', { pipelineName });
      return httpError(next, new Error('Pipeline name is required and must be a string'), req, 400);
    }

    if (!processors || !Array.isArray(processors) || processors.length === 0) {
      logger.error('Invalid processors configuration', { processors });
      return httpError(
        next,
        new Error('Processors array is required and cannot be empty'),
        req,
        400
      );
    }

    // Check if pipeline exists
    try {
      await client.ingest.getPipeline({ id: pipelineName });
    } catch (error) {
      if (error.meta?.statusCode === 404) {
        logger.error('Pipeline not found for update', { pipelineName });
        return httpError(next, new Error(`Pipeline '${pipelineName}' not found`), req, 404);
      }
      throw error;
    }

    const response = await client.ingest.putPipeline({
      id: pipelineName,
      body: {
        description: `Pipeline: ${pipelineName} (updated)`,
        processors
      }
    });

    logger.info('Pipeline updated successfully', {
      pipelineName,
      processorsCount: processors.length
    });

    return {
      pipelineName,
      acknowledged: response.acknowledged,
      processorsCount: processors.length
    };
  } catch (error) {
    logger.error('Pipeline update failed', {
      pipelineName,
      error: error.message,
      statusCode: error.meta?.statusCode
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.PIPELINE_ERROR), req, 500);
  }
});

/**
 * Delete an ingest pipeline
 * @param {string} pipelineName - Name of the pipeline to delete
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Pipeline deletion response
 */
export const deletePipeline = catchAsync(async (pipelineName, req, next) => {
  try {
    if (!pipelineName || typeof pipelineName !== 'string') {
      logger.error('Invalid pipeline name provided', { pipelineName });
      return httpError(next, new Error('Pipeline name is required and must be a string'), req, 400);
    }

    // Check if pipeline exists
    try {
      await client.ingest.getPipeline({ id: pipelineName });
    } catch (error) {
      if (error.meta?.statusCode === 404) {
        logger.error('Pipeline not found for deletion', { pipelineName });
        return httpError(next, new Error(`Pipeline '${pipelineName}' not found`), req, 404);
      }
      throw error;
    }

    const response = await client.ingest.deletePipeline({
      id: pipelineName
    });

    logger.info('Pipeline deleted successfully', { pipelineName });

    return {
      pipelineName,
      acknowledged: response.acknowledged
    };
  } catch (error) {
    logger.error('Pipeline deletion failed', {
      pipelineName,
      error: error.message,
      statusCode: error.meta?.statusCode
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.PIPELINE_ERROR), req, 500);
  }
});

/**
 * Get pipeline configuration
 * @param {string} pipelineName - Name of the pipeline
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Pipeline configuration
 */
export const getPipeline = catchAsync(async (pipelineName, req, next) => {
  try {
    if (!pipelineName || typeof pipelineName !== 'string') {
      logger.error('Invalid pipeline name provided', { pipelineName });
      return httpError(next, new Error('Pipeline name is required and must be a string'), req, 400);
    }

    const response = await client.ingest.getPipeline({
      id: pipelineName
    });

    logger.info('Pipeline retrieved successfully', { pipelineName });
    return response[pipelineName];
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      logger.error('Pipeline not found', { pipelineName });
      return httpError(next, new Error(`Pipeline '${pipelineName}' not found`), req, 404);
    }

    logger.error('Pipeline retrieval failed', {
      pipelineName,
      error: error.message,
      statusCode: error.meta?.statusCode
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.PIPELINE_ERROR), req, 500);
  }
});

// Document Processing Functions

/**
 * Process a single document through a pipeline
 * @param {Object} document - Document to process
 * @param {string} pipelineName - Name of the pipeline to use
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Processed document
 */
export const processDocument = catchAsync(async (document, pipelineName, req, next) => {
  try {
    if (!document || typeof document !== 'object') {
      logger.error('Invalid document provided', { document });
      return httpError(next, new Error('Document is required and must be an object'), req, 400);
    }

    // If no pipeline specified, return document as-is
    if (!pipelineName) {
      logger.info('No pipeline specified, returning document as-is');
      return document;
    }

    // Validate pipeline exists
    try {
      await client.ingest.getPipeline({ id: pipelineName });
    } catch (error) {
      if (error.meta?.statusCode === 404) {
        logger.error('Pipeline not found for document processing', { pipelineName });
        return httpError(next, new Error(`Pipeline '${pipelineName}' not found`), req, 404);
      }
      throw error;
    }

    const response = await client.ingest.simulate({
      id: pipelineName,
      body: {
        docs: [{ _source: document }]
      }
    });

    if (response.docs && response.docs.length > 0) {
      const processedDoc = response.docs[0];

      // Check for processing errors
      if (processedDoc.error) {
        logger.error('Document processing failed', {
          pipelineName,
          error: processedDoc.error
        });
        return httpError(
          next,
          new Error(`Document processing failed: ${processedDoc.error.reason}`),
          req,
          400
        );
      }

      logger.info('Document processed successfully', {
        pipelineName,
        originalFields: Object.keys(document).length,
        processedFields: Object.keys(processedDoc._source).length
      });

      return processedDoc._source;
    }

    logger.error('No processed document returned', { pipelineName });
    return httpError(next, new Error('Document processing failed - no result returned'), req, 500);
  } catch (error) {
    logger.error('Document processing failed', {
      pipelineName,
      error: error.message,
      statusCode: error.meta?.statusCode
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.PIPELINE_ERROR), req, 500);
  }
});

/**
 * Process multiple documents through a pipeline
 * @param {Array} documents - Array of documents to process
 * @param {string} pipelineName - Name of the pipeline to use
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Array} Array of processed documents
 */
export const processBatch = catchAsync(async (documents, pipelineName, req, next) => {
  try {
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      logger.error('Invalid documents array provided', { documents });
      return httpError(
        next,
        new Error('Documents array is required and cannot be empty'),
        req,
        400
      );
    }

    // If no pipeline specified, return documents as-is
    if (!pipelineName) {
      logger.info('No pipeline specified, returning documents as-is');
      return documents;
    }

    // Validate pipeline exists
    try {
      await client.ingest.getPipeline({ id: pipelineName });
    } catch (error) {
      if (error.meta?.statusCode === 404) {
        logger.error('Pipeline not found for batch processing', { pipelineName });
        return httpError(next, new Error(`Pipeline '${pipelineName}' not found`), req, 404);
      }
      throw error;
    }

    const docs = documents.map((doc) => ({ _source: doc }));
    const response = await client.ingest.simulate({
      id: pipelineName,
      body: { docs }
    });

    if (response.docs && response.docs.length > 0) {
      const processedDocs = [];
      const errors = [];

      response.docs.forEach((doc, index) => {
        if (doc.error) {
          errors.push({
            index,
            error: doc.error.reason,
            originalDoc: documents[index]
          });
        } else {
          processedDocs.push(doc._source);
        }
      });

      // Log errors but continue with successful documents
      if (errors.length > 0) {
        logger.warn('Some documents failed processing', {
          pipelineName,
          totalDocs: documents.length,
          successfulDocs: processedDocs.length,
          failedDocs: errors.length,
          errors: errors.slice(0, 5) // Log first 5 errors
        });
      }

      logger.info('Batch processing completed', {
        pipelineName,
        totalDocs: documents.length,
        successfulDocs: processedDocs.length,
        failedDocs: errors.length
      });

      return {
        processedDocuments: processedDocs,
        errors: errors.length > 0 ? errors : null,
        summary: {
          total: documents.length,
          successful: processedDocs.length,
          failed: errors.length
        }
      };
    }

    logger.error('No processed documents returned', { pipelineName });
    return httpError(next, new Error('Batch processing failed - no results returned'), req, 500);
  } catch (error) {
    logger.error('Batch processing failed', {
      pipelineName,
      error: error.message,
      statusCode: error.meta?.statusCode
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.PIPELINE_ERROR), req, 500);
  }
});

// Helper Functions for Common Pipeline Configurations

/**
 * Create a text processing pipeline with common text transformations
 * @param {string} pipelineName - Name of the pipeline
 * @param {Object} options - Configuration options
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Pipeline creation response
 */
export const createTextProcessingPipeline = catchAsync(
  async (pipelineName, options = {}, req, next) => {
    const {
      titleField = 'title',
      contentField = 'content',
      lowercaseFields = [titleField],
      trimFields = [titleField, contentField],
      removeFields = [],
      addTimestamp = true
    } = options;

    const processors = [];

    // Lowercase specified fields
    lowercaseFields.forEach((field) => {
      processors.push({
        [PIPELINE_PROCESSORS.LOWERCASE]: {
          field,
          ignore_missing: true
        }
      });
    });

    // Trim whitespace from specified fields
    trimFields.forEach((field) => {
      processors.push({
        [PIPELINE_PROCESSORS.TRIM]: {
          field,
          ignore_missing: true
        }
      });
    });

    // Remove specified fields
    removeFields.forEach((field) => {
      processors.push({
        [PIPELINE_PROCESSORS.REMOVE]: {
          field,
          ignore_missing: true
        }
      });
    });

    // Add timestamp if requested
    if (addTimestamp) {
      processors.push({
        [PIPELINE_PROCESSORS.SET]: {
          field: 'processed_at',
          value: '{{_ingest.timestamp}}'
        }
      });
    }

    // Add content length calculation
    if (contentField) {
      processors.push({
        [PIPELINE_PROCESSORS.SCRIPT]: {
          source: `
          if (ctx.${contentField} != null) {
            ctx.content_length = ctx.${contentField}.length();
          }
        `,
          ignore_failure: true
        }
      });
    }

    return createPipeline(pipelineName, processors, req, next);
  }
);

/**
 * Create an embedding pipeline for semantic search
 * @param {string} pipelineName - Name of the pipeline
 * @param {Object} options - Configuration options
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Pipeline creation response
 */
export const createEmbeddingPipeline = catchAsync(async (pipelineName, options = {}, req, next) => {
  const {
    textField = 'content',
    embeddingField = 'embedding',
    modelId = 'sentence-transformers__all-minilm-l6-v2',
    addMetadata = true
  } = options;

  const processors = [];

  // Text preprocessing
  processors.push({
    [PIPELINE_PROCESSORS.TRIM]: {
      field: textField,
      ignore_missing: true
    }
  });

  // Generate embeddings using inference processor
  // Note: This requires ML models to be deployed in Elasticsearch
  processors.push({
    inference: {
      model_id: modelId,
      target_field: embeddingField,
      field_map: {
        [textField]: 'text_field'
      },
      inference_config: {
        text_embedding: {
          results_field: 'predicted_value'
        }
      },
      on_failure: [
        {
          [PIPELINE_PROCESSORS.SET]: {
            field: 'embedding_error',
            value: 'Failed to generate embedding: {{_ingest.on_failure_message}}'
          }
        }
      ]
    }
  });

  // Add embedding metadata if requested
  if (addMetadata) {
    processors.push({
      [PIPELINE_PROCESSORS.SET]: {
        field: 'embedding_metadata',
        value: {
          model_id: modelId,
          text_field: textField,
          generated_at: '{{_ingest.timestamp}}'
        }
      }
    });
  }

  return createPipeline(pipelineName, processors, req, next);
});

/**
 * Create a data enrichment pipeline
 * @param {string} pipelineName - Name of the pipeline
 * @param {Object} options - Configuration options
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Pipeline creation response
 */
export const createDataEnrichmentPipeline = catchAsync(
  async (pipelineName, options = {}, req, next) => {
    const {
      categoryField = 'category',
      tagsField = 'tags',
      addDefaults = true,
      normalizeCategories = true
    } = options;

    const processors = [];

    // Add default values if requested
    if (addDefaults) {
      processors.push({
        [PIPELINE_PROCESSORS.SET]: {
          field: 'status',
          value: 'active',
          override: false
        }
      });

      processors.push({
        [PIPELINE_PROCESSORS.SET]: {
          field: 'created_at',
          value: '{{_ingest.timestamp}}',
          override: false
        }
      });
    }

    // Normalize categories to lowercase
    if (normalizeCategories && categoryField) {
      processors.push({
        [PIPELINE_PROCESSORS.LOWERCASE]: {
          field: categoryField,
          ignore_missing: true
        }
      });
    }

    // Convert tags to array if it's a string
    if (tagsField) {
      processors.push({
        [PIPELINE_PROCESSORS.SCRIPT]: {
          source: `
          if (ctx.${tagsField} != null && ctx.${tagsField} instanceof String) {
            ctx.${tagsField} = ctx.${tagsField}.splitOnToken(',').stream()
              .map(tag -> tag.trim().toLowerCase())
              .collect(Collectors.toList());
          }
        `,
          ignore_failure: true
        }
      });
    }

    // Add document type based on content
    processors.push({
      [PIPELINE_PROCESSORS.SCRIPT]: {
        source: `
        if (ctx.content != null) {
          int contentLength = ctx.content.length();
          if (contentLength < 100) {
            ctx.document_type = 'short';
          } else if (contentLength < 1000) {
            ctx.document_type = 'medium';
          } else {
            ctx.document_type = 'long';
          }
        }
      `,
        ignore_failure: true
      }
    });

    return createPipeline(pipelineName, processors, req, next);
  }
);

/**
 * Create a validation pipeline that checks required fields
 * @param {string} pipelineName - Name of the pipeline
 * @param {Object} options - Configuration options
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Pipeline creation response
 */
export const createValidationPipeline = catchAsync(
  async (pipelineName, options = {}, req, next) => {
    const {
      requiredFields = ['title', 'content'],
      validateEmail = false,
      emailField = 'email',
      validateDates = false,
      dateFields = ['created_at', 'updated_at']
    } = options;

    const processors = [];

    // Check required fields
    requiredFields.forEach((field) => {
      processors.push({
        [PIPELINE_PROCESSORS.SCRIPT]: {
          source: `
          if (ctx.${field} == null || ctx.${field} == '') {
            throw new Exception('Required field ${field} is missing or empty');
          }
        `
        }
      });
    });

    // Validate email format if requested
    if (validateEmail && emailField) {
      processors.push({
        [PIPELINE_PROCESSORS.SCRIPT]: {
          source: `
          if (ctx.${emailField} != null) {
            String email = ctx.${emailField};
            if (!email.contains('@') || !email.contains('.')) {
              throw new Exception('Invalid email format in field ${emailField}');
            }
          }
        `
        }
      });
    }

    // Validate date formats if requested
    if (validateDates && dateFields.length > 0) {
      dateFields.forEach((field) => {
        processors.push({
          [PIPELINE_PROCESSORS.DATE]: {
            field,
            formats: ['ISO8601', 'yyyy-MM-dd', 'yyyy-MM-dd HH:mm:ss'],
            on_failure: [
              {
                [PIPELINE_PROCESSORS.SCRIPT]: {
                  source: `throw new Exception('Invalid date format in field ${field}');`
                }
              }
            ]
          }
        });
      });
    }

    // Add validation timestamp
    processors.push({
      [PIPELINE_PROCESSORS.SET]: {
        field: 'validated_at',
        value: '{{_ingest.timestamp}}'
      }
    });

    return createPipeline(pipelineName, processors, req, next);
  }
);

/**
 * Get all available pipelines
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} List of all pipelines
 */
export const getAllPipelines = catchAsync(async (req, next) => {
  try {
    const response = await client.ingest.getPipeline();

    const pipelines = Object.keys(response).map((pipelineName) => ({
      name: pipelineName,
      description: response[pipelineName].description || '',
      processorsCount: response[pipelineName].processors?.length || 0
    }));

    logger.info('Retrieved all pipelines', { count: pipelines.length });
    return pipelines;
  } catch (error) {
    logger.error('Failed to retrieve pipelines', {
      error: error.message,
      statusCode: error.meta?.statusCode
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.PIPELINE_ERROR), req, 500);
  }
});

/**
 * Test pipeline with sample document
 * @param {string} pipelineName - Name of the pipeline to test
 * @param {Object} sampleDocument - Sample document to test with
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} Test results
 */
export const testPipeline = catchAsync(async (pipelineName, sampleDocument, req, next) => {
  try {
    if (!pipelineName || typeof pipelineName !== 'string') {
      logger.error('Invalid pipeline name provided for testing', { pipelineName });
      return httpError(next, new Error('Pipeline name is required and must be a string'), req, 400);
    }

    if (!sampleDocument || typeof sampleDocument !== 'object') {
      logger.error('Invalid sample document provided for testing', { sampleDocument });
      return httpError(
        next,
        new Error('Sample document is required and must be an object'),
        req,
        400
      );
    }

    // Validate pipeline exists
    try {
      await client.ingest.getPipeline({ id: pipelineName });
    } catch (error) {
      if (error.meta?.statusCode === 404) {
        logger.error('Pipeline not found for testing', { pipelineName });
        return httpError(next, new Error(`Pipeline '${pipelineName}' not found`), req, 404);
      }
      throw error;
    }

    const response = await client.ingest.simulate({
      id: pipelineName,
      body: {
        docs: [{ _source: sampleDocument }]
      }
    });

    const result = response.docs[0];
    const testResult = {
      pipelineName,
      originalDocument: sampleDocument,
      processedDocument: result._source,
      success: !result.error,
      error: result.error || null,
      processingTime: response.took || null
    };

    logger.info('Pipeline test completed', {
      pipelineName,
      success: testResult.success,
      hasError: Boolean(result.error)
    });

    return testResult;
  } catch (error) {
    logger.error('Pipeline testing failed', {
      pipelineName,
      error: error.message,
      statusCode: error.meta?.statusCode
    });
    return httpError(next, new Error(SEARCH_ERROR_CODES.PIPELINE_ERROR), req, 500);
  }
});
