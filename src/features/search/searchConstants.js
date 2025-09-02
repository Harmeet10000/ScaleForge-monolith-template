// Search error codes
export const SEARCH_ERROR_CODES = {
  INDEX_NOT_FOUND: 'INDEX_NOT_FOUND',
  INVALID_QUERY: 'INVALID_QUERY',
  EMBEDDING_FAILED: 'EMBEDDING_FAILED',
  PIPELINE_ERROR: 'PIPELINE_ERROR',
  AGGREGATION_ERROR: 'AGGREGATION_ERROR',
  KNN_ERROR: 'KNN_ERROR',
  VECTOR_DIMENSION_MISMATCH: 'VECTOR_DIMENSION_MISMATCH',
  SEARCH_TIMEOUT: 'SEARCH_TIMEOUT',
  BULK_INDEX_FAILED: 'BULK_INDEX_FAILED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INDEX_CREATION_FAILED: 'INDEX_CREATION_FAILED',
  PIPELINE_CREATION_FAILED: 'PIPELINE_CREATION_FAILED',
  DOCUMENT_NOT_FOUND: 'DOCUMENT_NOT_FOUND',
  ELASTICSEARCH_CONNECTION_ERROR: 'ELASTICSEARCH_CONNECTION_ERROR',
  INDEX_OPERATION_FAILED: 'INDEX_OPERATION_FAILED',
  UPDATE_OPERATION_FAILED: 'UPDATE_OPERATION_FAILED',
  DELETE_OPERATION_FAILED: 'DELETE_OPERATION_FAILED',
  INDEX_ALREADY_EXISTS: 'INDEX_ALREADY_EXISTS',
  MAPPING_UPDATE_FAILED: 'MAPPING_UPDATE_FAILED',
  INDEX_DELETION_FAILED: 'INDEX_DELETION_FAILED'
};

// Search response messages
export const SEARCH_MESSAGES = {
  SEARCH_SUCCESS: 'Search completed successfully',
  SEMANTIC_SEARCH_SUCCESS: 'Semantic search completed successfully',
  KNN_SEARCH_SUCCESS: 'KNN search completed successfully',
  AGGREGATION_SUCCESS: 'Aggregation completed successfully',
  NGRAM_SEARCH_SUCCESS: 'N-gram search completed successfully',
  FUZZY_SEARCH_SUCCESS: 'Fuzzy search completed successfully',
  INDEX_SUCCESS: 'Document indexed successfully',
  BULK_INDEX_SUCCESS: 'Bulk indexing completed successfully',
  PIPELINE_CREATED: 'Pipeline created successfully',
  INDEX_CREATED: 'Index created successfully',
  DOCUMENT_UPDATED: 'Document updated successfully',
  DOCUMENT_DELETED: 'Document deleted successfully',
  INDEX_DELETED: 'Index deleted successfully',
  PIPELINE_DELETED: 'Pipeline deleted successfully'
};

// Search configuration constants
export const SEARCH_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MAX_OFFSET: 10000,
  DEEP_PAGINATION_WARNING_THRESHOLD: 1000,
  CURSOR_PAGINATION_DEFAULT_SIZE: 50,
  MAX_CURSOR_PAGINATION_SIZE: 500,
  CACHE_TTL_SECONDS: 300,
  CACHE_MAX_ENTRIES: 1000,
  DEFAULT_VECTOR_DIMENSIONS: 768,
  DEFAULT_SIMILARITY_METRIC: 'cosine',
  DEFAULT_KNN_CANDIDATES_MULTIPLIER: 10,
  DEFAULT_FUZZY_DISTANCE: 'AUTO',
  DEFAULT_HIGHLIGHT_FRAGMENT_SIZE: 150,
  DEFAULT_HIGHLIGHT_FRAGMENTS: 3,
  SEARCH_TIMEOUT: '30s',
  BULK_SIZE: 1000,
  MAX_BULK_SIZE: 10000
};

// Index names
export const INDEX_NAMES = {
  DOCUMENTS: 'documents',
  VECTORS: 'vectors',
  USERS: 'users',
  LOGS: 'logs'
};

// Field names
export const FIELD_NAMES = {
  TITLE: 'title',
  CONTENT: 'content',
  EMBEDDING: 'embedding',
  METADATA: 'metadata',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
  CATEGORY: 'category',
  TAGS: 'tags',
  USER_ID: 'user_id'
};

// Analyzer names
export const ANALYZER_NAMES = {
  STANDARD: 'standard',
  NGRAM: 'ngram_analyzer',
  EDGE_NGRAM: 'edge_ngram_analyzer',
  FUZZY: 'fuzzy_analyzer',
  SEMANTIC: 'semantic_analyzer',
  KEYWORD: 'keyword'
};

// Similarity metrics for KNN
export const SIMILARITY_METRICS = {
  COSINE: 'cosine',
  EUCLIDEAN: 'l2_norm',
  DOT_PRODUCT: 'dot_product'
};

// Aggregation types
export const AGGREGATION_TYPES = {
  TERMS: 'terms',
  DATE_HISTOGRAM: 'date_histogram',
  RANGE: 'range',
  STATS: 'stats',
  CARDINALITY: 'cardinality',
  AVG: 'avg',
  SUM: 'sum',
  MIN: 'min',
  MAX: 'max'
};

// Pipeline processor types
export const PIPELINE_PROCESSORS = {
  LOWERCASE: 'lowercase',
  UPPERCASE: 'uppercase',
  TRIM: 'trim',
  REMOVE: 'remove',
  RENAME: 'rename',
  SET: 'set',
  SCRIPT: 'script',
  DATE: 'date',
  CONVERT: 'convert'
};

// Pagination types
export const PAGINATION_TYPES = {
  OFFSET: 'offset',
  CURSOR: 'cursor'
};

// Cache types
export const CACHE_TYPES = {
  SEARCH_RESULTS: 'search_results',
  AGGREGATIONS: 'aggregations',
  QUERY_SUGGESTIONS: 'query_suggestions'
};
