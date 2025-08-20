import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  generateEmbedding,
  generateBatchEmbeddings,
  getAvailableModels,
  getDefaultModel,
  isModelSupported,
  getModelConfig,
  loadModel,
  generateEmbeddingWithRetry,
  calculateSimilarity
} from '../../src/services/embeddingService.js';

describe('Embedding Service', () => {
  describe('generateEmbedding', () => {
    it('should generate embedding for valid text', async () => {
      const text = 'This is a test sentence for embedding generation.';
      const embedding = await generateEmbedding(text);

      assert(Array.isArray(embedding), 'Embedding should be an array');
      assert(embedding.length > 0, 'Embedding should not be empty');
      assert(
        embedding.every((val) => typeof val === 'number'),
        'All embedding values should be numbers'
      );
    });

    it('should throw error for empty text', async () => {
      try {
        await generateEmbedding('');
        assert.fail('Should throw error for empty text');
      } catch (error) {
        assert(
          error.message.includes('Text input is required'),
          'Should throw appropriate error message'
        );
      }
    });

    it('should throw error for non-string input', async () => {
      try {
        await generateEmbedding(123);
        assert.fail('Should throw error for non-string input');
      } catch (error) {
        assert(
          error.message.includes('must be a string'),
          'Should throw appropriate error message'
        );
      }
    });

    it('should throw error for unsupported model', async () => {
      try {
        await generateEmbedding('test text', 'unsupported-model');
        assert.fail('Should throw error for unsupported model');
      } catch (error) {
        assert(
          error.message.includes('Unsupported embedding model'),
          'Should throw appropriate error message'
        );
      }
    });

    it('should use default model when no model specified', async () => {
      const text = 'Test text for default model';
      const embedding = await generateEmbedding(text);

      assert(Array.isArray(embedding), 'Should generate embedding with default model');
      assert(embedding.length > 0, 'Embedding should not be empty');
    });
  });

  describe('generateBatchEmbeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      const texts = ['First test sentence.', 'Second test sentence.', 'Third test sentence.'];

      const embeddings = await generateBatchEmbeddings(texts);

      assert(Array.isArray(embeddings), 'Should return array of embeddings');
      assert(embeddings.length > 0, 'Should generate at least some embeddings');
      assert(
        embeddings.every((emb) => Array.isArray(emb)),
        'Each embedding should be an array'
      );
    });

    it('should throw error for empty array', async () => {
      try {
        await generateBatchEmbeddings([]);
        assert.fail('Should throw error for empty array');
      } catch (error) {
        assert(error.message.includes('non-empty array'), 'Should throw appropriate error message');
      }
    });

    it('should throw error for non-array input', async () => {
      try {
        await generateBatchEmbeddings('not an array');
        assert.fail('Should throw error for non-array input');
      } catch (error) {
        assert(
          error.message.includes('must be a non-empty array'),
          'Should throw appropriate error message'
        );
      }
    });

    it('should handle mixed valid and invalid texts', async () => {
      const texts = ['Valid text one.', null, 'Valid text two.', '', 'Valid text three.'];

      const embeddings = await generateBatchEmbeddings(texts);

      assert(Array.isArray(embeddings), 'Should return array of embeddings');
      // Should have fewer embeddings than input texts due to invalid entries
      assert(embeddings.length < texts.length, 'Should filter out invalid texts');
      assert(embeddings.length > 0, 'Should generate some valid embeddings');
    });
  });

  describe('Model Management', () => {
    it('should return available models', () => {
      const models = getAvailableModels();

      assert(typeof models === 'object', 'Should return object');
      assert(Object.keys(models).length > 0, 'Should have at least one model');
      assert(models['text-embedding-004'], 'Should include text-embedding-004 model');
    });

    it('should return default model', () => {
      const defaultModel = getDefaultModel();

      assert(typeof defaultModel === 'string', 'Should return string');
      assert(defaultModel.length > 0, 'Should not be empty');
    });

    it('should validate supported models', () => {
      assert(isModelSupported('text-embedding-004'), 'Should support text-embedding-004');
      assert(isModelSupported('gemini-embedding-001'), 'Should support gemini-embedding-001');
      assert(!isModelSupported('unsupported-model'), 'Should not support unsupported model');
    });

    it('should return model configuration', () => {
      const config = getModelConfig('text-embedding-004');

      assert(typeof config === 'object', 'Should return object');
      assert(config.name === 'text-embedding-004', 'Should have correct name');
      assert(typeof config.dimensions === 'number', 'Should have dimensions');
      assert(typeof config.maxTokens === 'number', 'Should have maxTokens');
    });

    it('should return null for unsupported model config', () => {
      const config = getModelConfig('unsupported-model');
      assert(config === null, 'Should return null for unsupported model');
    });
  });

  describe('loadModel', () => {
    it('should load and validate supported model', async () => {
      const result = await loadModel('text-embedding-004');

      assert(typeof result === 'object', 'Should return object');
      assert(result.modelName === 'text-embedding-004', 'Should have correct model name');
      assert(result.status === 'loaded', 'Should have loaded status');
      assert(result.validated === true, 'Should be validated');
      assert(typeof result.dimensions === 'number', 'Should have dimensions');
    });

    it('should throw error for unsupported model', async () => {
      try {
        await loadModel('unsupported-model');
        assert.fail('Should throw error for unsupported model');
      } catch (error) {
        assert(
          error.message.includes('Unsupported model'),
          'Should throw appropriate error message'
        );
      }
    });

    it('should throw error for empty model name', async () => {
      try {
        await loadModel('');
        assert.fail('Should throw error for empty model name');
      } catch (error) {
        assert(
          error.message.includes('Model name is required'),
          'Should throw appropriate error message'
        );
      }
    });
  });

  describe('generateEmbeddingWithRetry', () => {
    it('should generate embedding with retry logic', async () => {
      const text = 'Test text for retry logic';
      const embedding = await generateEmbeddingWithRetry(text, 'text-embedding-004', 2);

      assert(Array.isArray(embedding), 'Should return embedding array');
      assert(embedding.length > 0, 'Embedding should not be empty');
    });

    it('should use default retry count', async () => {
      const text = 'Test text for default retry';
      const embedding = await generateEmbeddingWithRetry(text);

      assert(Array.isArray(embedding), 'Should return embedding array');
      assert(embedding.length > 0, 'Embedding should not be empty');
    });
  });

  describe('calculateSimilarity', () => {
    const embedding1 = [1, 2, 3, 4, 5];
    const embedding2 = [2, 3, 4, 5, 6];

    it('should calculate cosine similarity', () => {
      const similarity = calculateSimilarity(embedding1, embedding2, 'cosine');

      assert(typeof similarity === 'number', 'Should return number');
      assert(similarity >= -1 && similarity <= 1, 'Cosine similarity should be between -1 and 1');
    });

    it('should calculate euclidean distance', () => {
      const distance = calculateSimilarity(embedding1, embedding2, 'euclidean');

      assert(typeof distance === 'number', 'Should return number');
      assert(distance >= 0, 'Euclidean distance should be non-negative');
    });

    it('should calculate dot product', () => {
      const dotProd = calculateSimilarity(embedding1, embedding2, 'dot_product');

      assert(typeof dotProd === 'number', 'Should return number');
    });

    it('should throw error for mismatched dimensions', () => {
      const embedding3 = [1, 2, 3]; // Different length

      try {
        calculateSimilarity(embedding1, embedding3, 'cosine');
        assert.fail('Should throw error for mismatched dimensions');
      } catch (error) {
        assert(error.message.includes('same dimensions'), 'Should throw appropriate error message');
      }
    });

    it('should throw error for non-array inputs', () => {
      try {
        calculateSimilarity('not array', embedding2, 'cosine');
        assert.fail('Should throw error for non-array input');
      } catch (error) {
        assert(error.message.includes('must be arrays'), 'Should throw appropriate error message');
      }
    });

    it('should throw error for unsupported metric', () => {
      try {
        calculateSimilarity(embedding1, embedding2, 'unsupported');
        assert.fail('Should throw error for unsupported metric');
      } catch (error) {
        assert(
          error.message.includes('Unsupported similarity metric'),
          'Should throw appropriate error message'
        );
      }
    });

    it('should use cosine as default metric', () => {
      const similarity1 = calculateSimilarity(embedding1, embedding2);
      const similarity2 = calculateSimilarity(embedding1, embedding2, 'cosine');

      assert(similarity1 === similarity2, 'Should use cosine as default metric');
    });
  });
});
