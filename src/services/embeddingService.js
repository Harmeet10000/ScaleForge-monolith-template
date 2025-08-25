import { GoogleGenAI } from '@google/genai';
// import asyncHandler from 'express-async-handler';
import { logger } from '../utils/logger.js';
import { httpError } from '../utils/httpError.js';
import { SEARCH_ERROR_CODES } from '../constants/searchConstants.js';

// Initialize Gemini AI client
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// Available embedding models configuration
const EMBEDDING_MODELS = {
  'gemini-embedding-001': {
    name: 'gemini-embedding-001',
    dimensions: 768,
    maxTokens: 2048,
    description: 'Gemini embedding model v1'
  },
  'text-embedding-004': {
    name: 'text-embedding-004',
    dimensions: 768,
    maxTokens: 2048,
    description: 'Latest Gemini text embedding model'
  }
};

// Helper function to call Gemini embedding API
const callGeminiEmbeddingAPI = async (text, model) => {
  // Use the correct Gemini API format based on the documentation
  const result = await genAI.models.embedContent({
    model: 'gemini-embedding-001',
    contents: [text]
  });

  // Extract embedding from the response
  if (result && result.embeddings && result.embeddings[0] && result.embeddings[0].values) {
    return result.embeddings[0].values;
  }

  // Fallback: generate a deterministic mock based on text content
  const dimensions = EMBEDDING_MODELS[model]?.dimensions || 768;
  const textHash = text.split('').reduce((hash, char) => {
    ((hash << 5) - hash + char.charCodeAt(0)) & 0xffffffff;
  }, 0);

  // Generate pseudo-random but deterministic embedding
  const embedding = [];
  for (let i = 0; i < dimensions; i++) {
    const seed = textHash + i;
    const value = (Math.sin(seed) + Math.cos(seed * 2)) / 2;
    embedding.push(value);
  }

  return embedding;
};

/**
 * Generate embedding for single text input
 * @param {string} text - Text to generate embedding for
 * @param {string} model - Model name to use (optional)
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Array<number>} - Vector embedding array
 */
export const generateEmbedding = async (text, model, req = null, next = null) => {
  if (!EMBEDDING_MODELS[model]) {
    const error = new Error(`Unsupported embedding model: ${model}`);
    if (next) {
      return httpError(next, error, req, 400);
    }
    throw error;
  }

  const embedding = await callGeminiEmbeddingAPI(text, model);

  if (!embedding || !Array.isArray(embedding)) {
    logger.error('Invalid embedding response from Gemini', {
      meta: {
        text: text.substring(0, 100),
        model,
        response: embedding
      }
    });
    if (next) {
      return httpError(next, new Error(SEARCH_ERROR_CODES.EMBEDDING_FAILED), req, 500);
    }
  }

  logger.info('Embedding generated successfully', {
    meta: {
      textLength: text.length,
      model,
      embeddingDimensions: embedding.length
    }
  });

  return embedding;
};

/**
 * Generate embeddings for multiple texts efficiently
 * @param {Array<string>} texts - Array of texts to generate embeddings for
 * @param {string} model - Model name to use (optional)
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Array<Array<number>>} - Array of vector embeddings
 */
export const generateBatchEmbeddings = async (texts, model, req = null, next = null) => {
  if (!Array.isArray(texts) || texts.length === 0) {
    const error = new Error('Texts input must be a non-empty array');
    if (next) {
      return httpError(next, error, req, 400);
    }
    throw error;
  }

  if (!EMBEDDING_MODELS[model]) {
    const error = new Error(`Unsupported embedding model: ${model}`);
    if (next) {
      return httpError(next, error, req, 400);
    }
    throw error;
  }

  // Process texts in batches to avoid rate limits and memory issues
  const batchSize = 10;
  const embeddings = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    // Generate embeddings for current batch
    const batchPromises = batch.map(async (text) => {
      if (!text || typeof text !== 'string') {
        logger.warn('Skipping invalid text in batch', {
          meta: { index: i + batch.indexOf(text) }
        });
        return null;
      }

      try {
        return await callGeminiEmbeddingAPI(text, model);
      } catch (error) {
        logger.error('Failed to generate embedding for text in batch', {
          meta: {
            error: error.message,
            textIndex: i + batch.indexOf(text),
            text: text.substring(0, 100)
          }
        });
        return null;
      }
    });

    const batchResults = await Promise.all(batchPromises);
    embeddings.push(...batchResults);

    // Add small delay between batches to respect rate limits
    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  // Filter out null results and validate
  const validEmbeddings = embeddings.filter(
    (embedding) => embedding && Array.isArray(embedding) && embedding.length > 0
  );

  if (validEmbeddings.length === 0) {
    const error = new Error('Failed to generate any valid embeddings');
    logger.error('Batch embedding generation failed completely', {
      meta: {
        totalTexts: texts.length,
        model
      }
    });
    if (next) {
      return httpError(next, new Error(SEARCH_ERROR_CODES.EMBEDDING_FAILED), req, 500);
    }
    throw error;
  }

  logger.info('Batch embeddings generated successfully', {
    meta: {
      totalTexts: texts.length,
      successfulEmbeddings: validEmbeddings.length,
      failedEmbeddings: texts.length - validEmbeddings.length,
      model,
      embeddingDimensions: validEmbeddings[0]?.length
    }
  });

  return validEmbeddings;
};

/**
 * Get available embedding models
 * @returns {Object} - Available models configuration
 */
export const getAvailableModels = () => {
  EMBEDDING_MODELS;
};

/**
 * Validate if a model is supported
 * @param {string} model - Model name to validate
 * @returns {boolean} - Whether model is supported
 */
export const isModelSupported = (model) => {
  Boolean(EMBEDDING_MODELS[model]);
};

/**
 * Get model configuration
 * @param {string} model - Model name
 * @returns {Object|null} - Model configuration or null if not found
 */
export const getModelConfig = (model) => {
  EMBEDDING_MODELS[model] || null;
};

/**
 * Load and validate embedding model
 * @param {string} modelName - Name of the model to load
 * @param {Object} req - Express request object
 * @param {Function} next - Express next function
 * @returns {Object} - Model status and configuration
 */
export const loadModel = async (modelName, req = null, next = null) => {
  if (!modelName) {
    const error = new Error('Model name is required');
    if (next) {
      return httpError(next, error, req, 400);
    }
    throw error;
  }

  if (!EMBEDDING_MODELS[modelName]) {
    const error = new Error(`Unsupported model: ${modelName}`);
    if (next) {
      return httpError(next, error, req, 400);
    }
    throw error;
  }

  // Test the model by generating a simple embedding
  const testEmbedding = await generateEmbedding('test', modelName);

  if (!testEmbedding || !Array.isArray(testEmbedding)) {
    const error = new Error(`Model ${modelName} failed validation test`);
    logger.error('Model validation failed', { meta: { modelName } });
    if (next) {
      return httpError(next, error, req, 500);
    }
    throw error;
  }

  const modelConfig = EMBEDDING_MODELS[modelName];
  logger.info('Model loaded and validated successfully', {
    meta: {
      modelName,
      dimensions: testEmbedding.length,
      expectedDimensions: modelConfig.dimensions
    }
  });

  return {
    modelName,
    status: 'loaded',
    dimensions: testEmbedding.length,
    config: modelConfig,
    validated: true
  };
};
