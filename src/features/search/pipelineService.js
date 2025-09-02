import { client } from '../../connections/connectElasticSearch.js';
import asyncHandler from 'express-async-handler';
import { httpError } from '../../utils/httpError.js';
import { logger } from '../../utils/logger.js';
import {
  // SEARCH_ERROR_CODES,
  // SEARCH_MESSAGES,
  PIPELINE_PROCESSORS
} from './searchConstants.js';

/**
 * Pipeline Service for Elasticsearch Ingest Pipelines
 * Handles pipeline management and document processing
 */

// Pipeline Management Functions

export const createPipeline = asyncHandler(async (pipelineName, processors, req, next) => {
  // Validate pipeline configuration
  if (!pipelineName || typeof pipelineName !== 'string') {
    logger.error('Invalid pipeline name provided', { meta: { pipelineName } });
    return httpError(next, new Error('Pipeline name is required and must be a string'), req, 400);
  }

  if (!processors || !Array.isArray(processors) || processors.length === 0) {
    logger.error('Invalid processors configuration', { meta: { processors } });
    return httpError(next, new Error('Processors array is required and cannot be empty'), req, 400);
  }

  // Check if pipeline already exists
  try {
    await client.ingest.getPipeline({ id: pipelineName });
    logger.warn('Pipeline already exists', { meta: { pipelineName } });
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
    meta: {
      pipelineName,
      processorsCount: processors.length
    }
  });

  return {
    pipelineName,
    acknowledged: response.acknowledged,
    processorsCount: processors.length
  };
});

export const updatePipeline = asyncHandler(async (pipelineName, processors, req, next) => {
  // Check if pipeline exists
  try {
    await client.ingest.getPipeline({ id: pipelineName });
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      logger.error('Pipeline not found for update', { meta: { pipelineName } });
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
    meta: {
      pipelineName,
      processorsCount: processors.length
    }
  });

  return {
    pipelineName,
    acknowledged: response.acknowledged,
    processorsCount: processors.length
  };
});

export const deletePipeline = asyncHandler(async (pipelineName, req, next) => {
  // Check if pipeline exists
  try {
    await client.ingest.getPipeline({ id: pipelineName });
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      logger.error('Pipeline not found for deletion', { meta: { pipelineName } });
      return httpError(next, new Error(`Pipeline '${pipelineName}' not found`), req, 404);
    }
  }

  const response = await client.ingest.deletePipeline({
    id: pipelineName
  });

  logger.info('Pipeline deleted successfully', { meta: { pipelineName } });

  return {
    pipelineName,
    acknowledged: response.acknowledged
  };
});

export const getPipeline = asyncHandler(async (pipelineName) => {
  const response = await client.ingest.getPipeline({
    id: pipelineName
  });

  logger.info('Pipeline retrieved successfully', { meta: { pipelineName } });
  return response[pipelineName];
});

// Document Processing Functions

export const processDocument = asyncHandler(async (document, pipelineName, req, next) => {
  // Validate pipeline exists
  try {
    await client.ingest.getPipeline({ id: pipelineName });
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      logger.error('Pipeline not found for document processing', { meta: { pipelineName } });
      return httpError(next, new Error(`Pipeline '${pipelineName}' not found`), req, 404);
    }
    // Re-throw other errors
    throw error;
  }

  const response = await client.ingest.simulate({
    id: pipelineName,
    body: {
      docs: [{ _source: document }]
    }
  });

  logger.info('Pipeline simulation response', {
    meta: {
      pipelineName,
      responseStructure: {
        hasDocs: Boolean(response.docs),
        docsLength: response.docs?.length || 0,
        firstDocStructure: response.docs?.[0] ? Object.keys(response.docs[0]) : []
      }
    }
  });

  if (response.docs && response.docs.length > 0) {
    const processedDoc = response.docs[0];

    // Check for processing errors
    if (processedDoc.error) {
      logger.error('Document processing failed', {
        meta: {
          pipelineName,
          error: processedDoc.error.reason || processedDoc.error,
          statusCode: processedDoc.error.status
        }
      });
      return httpError(
        next,
        new Error(`Document processing failed: ${processedDoc.error.reason || processedDoc.error}`),
        req,
        400
      );
    }

    // Handle different response structures
    let processedSource;
    if (processedDoc.doc && processedDoc.doc._source) {
      // Structure: { doc: { _source: {...} } }
      processedSource = processedDoc.doc._source;
    } else if (processedDoc._source) {
      // Structure: { _source: {...} }
      processedSource = processedDoc._source;
    } else {
      // Fallback: use the document as-is
      processedSource = processedDoc;
    }

    if (!processedSource || typeof processedSource !== 'object') {
      logger.error('Invalid processed document structure', {
        meta: {
          pipelineName,
          processedDoc,
          processedSource
        }
      });
      return httpError(next, new Error('Invalid processed document structure'), req, 500);
    }

    logger.info('Document processed successfully', {
      meta: {
        pipelineName,
        originalFields: Object.keys(document).length,
        processedFields: Object.keys(processedSource).length
      }
    });

    return processedSource;
  }

  logger.error('No processed document returned', { meta: { pipelineName } });
  return httpError(next, new Error('Document processing failed - no result returned'), req, 500);
});

export const processBatch = asyncHandler(async (documents, pipelineName, req, next) => {
  // Validate pipeline exists
  try {
    await client.ingest.getPipeline({ id: pipelineName });
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      logger.error('Pipeline not found for batch processing', { meta: { pipelineName } });
      return httpError(next, new Error(`Pipeline '${pipelineName}' not found`), req, 404);
    }
  }

  // Extract _source from documents if they have bulk format structure
  const docs = documents.map((doc) => {
    // If document has _source property (bulk format), use that
    if (doc._source) {
      return { _source: doc._source };
    }
    // Otherwise, use the document as-is
    return { _source: doc };
  });
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
          error: doc.error.reason || doc.error,
          originalDoc: documents[index]
        });
      } else {
        // Handle different response structures
        let processedSource;
        if (doc.doc && doc.doc._source) {
          // Structure: { doc: { _source: {...} } }
          processedSource = doc.doc._source;
        } else if (doc._source) {
          // Structure: { _source: {...} }
          processedSource = doc._source;
        } else {
          // Fallback: use the document as-is
          processedSource = doc;
        }

        if (processedSource && typeof processedSource === 'object') {
          processedDocs.push(processedSource);
        } else {
          errors.push({
            index,
            error: 'Invalid processed document structure',
            originalDoc: documents[index]
          });
        }
      }
    });

    // Log errors but continue with successful documents
    if (errors.length > 0) {
      logger.warn('Some documents failed processing', {
        meta: {
          pipelineName,
          totalDocs: documents.length,
          successfulDocs: processedDocs.length,
          failedDocs: errors.length,
          errors: errors.slice(0, 5) // Log first 5 errors
        }
      });
    }

    logger.info('Batch processing completed', {
      meta: {
        pipelineName,
        totalDocs: documents.length,
        successfulDocs: processedDocs.length,
        failedDocs: errors.length
      }
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

  logger.error('No processed documents returned', { meta: { pipelineName } });
  return httpError(next, new Error('Batch processing failed - no results returned'), req, 500);
});

// Helper Functions for Common Pipeline Configurations

export const createTextProcessingPipeline = asyncHandler(
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

export const createEmbeddingPipeline = asyncHandler(
  async (pipelineName, options = {}, req, next) => {
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
  }
);

export const createDataEnrichmentPipeline = asyncHandler(
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

export const createValidationPipeline = asyncHandler(
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

export const getAllPipelines = asyncHandler(async () => {
  const response = await client.ingest.getPipeline();

  const pipelines = Object.keys(response).map((pipelineName) => ({
    name: pipelineName,
    description: response[pipelineName].description || '',
    processorsCount: response[pipelineName].processors?.length || 0
  }));

  logger.info('Retrieved all pipelines', { meta: { count: pipelines.length } });
  return pipelines;
});

export const testPipeline = asyncHandler(async (pipelineName, sampleDocument, req, next) => {
  // Validate pipeline exists
  try {
    await client.ingest.getPipeline({ id: pipelineName });
  } catch (error) {
    if (error.meta?.statusCode === 404) {
      logger.error('Pipeline not found for testing', { meta: { pipelineName } });
      return httpError(next, new Error(`Pipeline '${pipelineName}' not found`), req, 404);
    }
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
    meta: {
      pipelineName,
      success: testResult.success,
      hasError: Boolean(result.error)
    }
  });

  return testResult;
});
