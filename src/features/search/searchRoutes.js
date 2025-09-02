import express from 'express';
import {
  search,
  semanticSearch,
  knnSearch,
  ngramSearch,
  fuzzySearch,
  aggregateSearch,
  indexDocument,
  bulkIndex,
  updateDocument,
  deleteDocument,
  createIndex,
  deleteIndex,
  createPipeline,
  updatePipeline,
  deletePipeline,
  getPipeline,
  searchHealthCheck
} from './searchController.js';

const router = express.Router();

// Middleware for search authorization
// const authorize = ('search', 'viewer');
// const authorizeSearchWrite = authorize('search', 'editor');
// const authorizeSearchAdmin = authorize('search', 'admin');

/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Elasticsearch search operations
 */

// Core Search Routes

/**
 * @swagger
 * /search:
 *   get:
 *     summary: Multi-field search
 *     description: Perform multi-field search with pagination, filtering, and sorting
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query string
 *       - in: query
 *         name: fields
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Fields to search in
 *       - in: query
 *         name: index
 *         required: true
 *         schema:
 *           type: string
 *         description: Elasticsearch index name
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Search completed successfully
 *       400:
 *         description: Invalid search parameters
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       422:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 */
router.get('/', search);

/**
 * @swagger
 * /search/semantic:
 *   post:
 *     summary: Semantic search using vector embeddings
 *     description: Perform semantic search using natural language queries and vector similarity
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *               - index
 *             properties:
 *               query:
 *                 type: string
 *                 description: Natural language search query
 *               index:
 *                 type: string
 *                 description: Elasticsearch index name
 *               threshold:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 description: Similarity threshold
 *               hybridMode:
 *                 type: boolean
 *                 description: Combine with keyword search
 *     responses:
 *       200:
 *         description: Semantic search completed successfully
 *       400:
 *         description: Invalid search parameters
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       422:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/semantic', semanticSearch);

/**
 * @swagger
 * /search/knn:
 *   post:
 *     summary: K-Nearest Neighbors search
 *     description: Find similar documents using vector similarity and KNN algorithm
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - vector
 *               - k
 *               - index
 *             properties:
 *               vector:
 *                 type: array
 *                 items:
 *                   type: number
 *                 description: Query vector for similarity search
 *               k:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 description: Number of nearest neighbors to return
 *               index:
 *                 type: string
 *                 description: Elasticsearch index name
 *               similarityMetric:
 *                 type: string
 *                 enum: [cosine, euclidean, dot_product]
 *                 description: Similarity metric to use
 *     responses:
 *       200:
 *         description: KNN search completed successfully
 *       400:
 *         description: Invalid search parameters
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       422:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/knn', knnSearch);

/**
 * @swagger
 * /search/ngram:
 *   post:
 *     summary: N-gram search for partial matching
 *     description: Perform n-gram search for partial text matching and typo tolerance
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *               - index
 *             properties:
 *               query:
 *                 type: string
 *                 description: Search query string
 *               index:
 *                 type: string
 *                 description: Elasticsearch index name
 *               fields:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Fields to search in
 *               ngramType:
 *                 type: string
 *                 enum: [ngram, edge_ngram, both]
 *                 description: Type of n-gram analysis to use
 *               minScore:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 description: Minimum score threshold
 *     responses:
 *       200:
 *         description: N-gram search completed successfully
 *       400:
 *         description: Invalid search parameters
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       422:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/ngram', ngramSearch);

/**
 * @swagger
 * /search/fuzzy:
 *   post:
 *     summary: Fuzzy search with typo tolerance
 *     description: Perform fuzzy search with advanced typo tolerance and phonetic matching
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *               - index
 *             properties:
 *               query:
 *                 type: string
 *                 description: Search query string
 *               index:
 *                 type: string
 *                 description: Elasticsearch index name
 *               fields:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Fields to search in
 *               fuzziness:
 *                 type: string
 *                 enum: [AUTO, '0', '1', '2']
 *                 description: Fuzziness level for typo tolerance
 *               prefixLength:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 10
 *                 description: Number of initial characters that must match exactly
 *               maxExpansions:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 1000
 *                 description: Maximum number of terms to expand to
 *     responses:
 *       200:
 *         description: Fuzzy search completed successfully
 *       400:
 *         description: Invalid search parameters
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       422:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/fuzzy', fuzzySearch);

/**
 * @swagger
 * /search/aggregate:
 *   post:
 *     summary: Search with aggregations
 *     description: Perform search with statistical aggregations for analytics
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - index
 *               - aggregations
 *             properties:
 *               index:
 *                 type: string
 *                 description: Elasticsearch index name
 *               query:
 *                 type: object
 *                 description: Base query for aggregation
 *               aggregations:
 *                 type: object
 *                 description: Aggregation definitions
 *     responses:
 *       200:
 *         description: Aggregation completed successfully
 *       400:
 *         description: Invalid aggregation parameters
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       422:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/aggregate', aggregateSearch);

// Document Management Routes
// router.use(protect);
/**
 * @swagger
 * /search/index:
 *   post:
 *     summary: Index a single document
 *     description: Index a document with optional pipeline processing
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - document
 *               - index
 *             properties:
 *               document:
 *                 type: object
 *                 description: Document to index
 *               index:
 *                 type: string
 *                 description: Elasticsearch index name
 *               id:
 *                 type: string
 *                 description: Document ID (optional)
 *               pipeline:
 *                 type: string
 *                 description: Ingest pipeline name (optional)
 *     responses:
 *       201:
 *         description: Document indexed successfully
 *       400:
 *         description: Invalid document data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       422:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/index', indexDocument);

/**
 * @swagger
 * /search/bulk:
 *   post:
 *     summary: Bulk index documents
 *     description: Index multiple documents efficiently with optional pipeline processing
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documents
 *               - index
 *             properties:
 *               documents:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Array of documents to index
 *               index:
 *                 type: string
 *                 description: Elasticsearch index name
 *               pipeline:
 *                 type: string
 *                 description: Ingest pipeline name (optional)
 *     responses:
 *       201:
 *         description: Bulk indexing completed successfully
 *       400:
 *         description: Invalid bulk data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       422:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/bulk', bulkIndex);

/**
 * @swagger
 * /search/document/{id}:
 *   put:
 *     summary: Update a document
 *     description: Update an existing document in the search index
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - document
 *               - index
 *             properties:
 *               document:
 *                 type: object
 *                 description: Updated document data
 *               index:
 *                 type: string
 *                 description: Elasticsearch index name
 *     responses:
 *       200:
 *         description: Document updated successfully
 *       400:
 *         description: Invalid document data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Document not found
 *       422:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 */
router.put('/document/:id', updateDocument);

/**
 * @swagger
 * /search/document/{id}:
 *   delete:
 *     summary: Delete a document
 *     description: Delete a document from the search index
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *       - in: query
 *         name: index
 *         required: true
 *         schema:
 *           type: string
 *         description: Elasticsearch index name
 *     responses:
 *       200:
 *         description: Document deleted successfully
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Document not found
 *       422:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 */
router.delete('/document/:id', deleteDocument);

// Index Management Routes

/**
 * @swagger
 * /search/index/create:
 *   post:
 *     summary: Create a search index
 *     description: Create a new Elasticsearch index with mappings and settings
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: Index name
 *               mapping:
 *                 type: object
 *                 description: Index field mappings
 *               settings:
 *                 type: object
 *                 description: Index settings
 *               aliases:
 *                 type: object
 *                 description: Index aliases
 *     responses:
 *       201:
 *         description: Index created successfully
 *       400:
 *         description: Invalid index configuration
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Index already exists
 *       422:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/index/create', createIndex);

/**
 * @swagger
 * /search/index/{indexName}:
 *   delete:
 *     summary: Delete a search index
 *     description: Delete an Elasticsearch index and all its data
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: indexName
 *         required: true
 *         schema:
 *           type: string
 *         description: Index name to delete
 *     responses:
 *       200:
 *         description: Index deleted successfully
 *       400:
 *         description: Invalid index name
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Index not found
 *       429:
 *         description: Rate limit exceeded
 */
router.delete(
  '/index/:indexName',

  deleteIndex
);

// Pipeline Management Routes

/**
 * @swagger
 * /search/pipeline:
 *   post:
 *     summary: Create an ingest pipeline
 *     description: Create a new Elasticsearch ingest pipeline for data processing
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - processors
 *             properties:
 *               name:
 *                 type: string
 *                 description: Pipeline name
 *               processors:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Pipeline processors
 *               description:
 *                 type: string
 *                 description: Pipeline description
 *               onFailure:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Failure handling processors
 *     responses:
 *       201:
 *         description: Pipeline created successfully
 *       400:
 *         description: Invalid pipeline configuration
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Pipeline already exists
 *       422:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/pipeline', createPipeline);

/**
 * @swagger
 * /search/pipeline/{pipelineId}:
 *   put:
 *     summary: Update an ingest pipeline
 *     description: Update an existing Elasticsearch ingest pipeline
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pipelineId
 *         required: true
 *         schema:
 *           type: string
 *         description: Pipeline ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - processors
 *             properties:
 *               processors:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Updated pipeline processors
 *               description:
 *                 type: string
 *                 description: Pipeline description
 *               onFailure:
 *                 type: array
 *                 items:
 *                   type: object
 *                 description: Failure handling processors
 *     responses:
 *       200:
 *         description: Pipeline updated successfully
 *       400:
 *         description: Invalid pipeline configuration
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Pipeline not found
 *       422:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 */
router.put(
  '/pipeline/:pipelineId',

  updatePipeline
);

/**
 * @swagger
 * /search/pipeline/{pipelineId}:
 *   delete:
 *     summary: Delete an ingest pipeline
 *     description: Delete an Elasticsearch ingest pipeline
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pipelineId
 *         required: true
 *         schema:
 *           type: string
 *         description: Pipeline ID
 *     responses:
 *       200:
 *         description: Pipeline deleted successfully
 *       400:
 *         description: Invalid pipeline ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Pipeline not found
 *       429:
 *         description: Rate limit exceeded
 */
router.delete(
  '/pipeline/:pipelineId',

  deletePipeline
);

/**
 * @swagger
 * /search/pipeline/{pipelineId}:
 *   get:
 *     summary: Get pipeline information
 *     description: Retrieve information about an Elasticsearch ingest pipeline
 *     tags: [Search]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pipelineId
 *         required: true
 *         schema:
 *           type: string
 *         description: Pipeline ID
 *     responses:
 *       200:
 *         description: Pipeline information retrieved successfully
 *       400:
 *         description: Invalid pipeline ID
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Pipeline not found
 *       429:
 *         description: Rate limit exceeded
 */
router.get('/pipeline/:pipelineId', getPipeline);

// Health and Statistics Routes
/**
 * @swagger
 * /search/health:
 *   get:
 *     summary: Search system health check
 *     description: Check the health status of the search system and Elasticsearch cluster
 *     tags: [Search]
 *     responses:
 *       200:
 *         description: Search system is healthy
 *       503:
 *         description: Search system is unhealthy
 */
router.get('/health', searchHealthCheck);

export default router;
