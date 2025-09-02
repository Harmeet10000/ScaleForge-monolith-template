import Joi from 'joi';
import {
  SEARCH_CONFIG,
  SIMILARITY_METRICS,
  AGGREGATION_TYPES,
  INDEX_NAMES,
  FIELD_NAMES
} from './searchConstants.js';

// Common validation schemas
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(SEARCH_CONFIG.MAX_PAGE_SIZE)
    .default(SEARCH_CONFIG.DEFAULT_PAGE_SIZE)
  // mber().integer().min(0).max(SEARCH_CONFIG.MAX_OFFSET).optional()
});

const sortSchema = Joi.object().pattern(
  Joi.string(),
  Joi.alternatives().try(
    Joi.string().valid('asc', 'desc'),
    Joi.object({
      order: Joi.string().valid('asc', 'desc').required(),
      missing: Joi.string().valid('_first', '_last').optional()
    })
  )
);

const filtersSchema = Joi.object().pattern(
  Joi.string(),
  Joi.alternatives().try(
    Joi.string(),
    Joi.number(),
    Joi.boolean(),
    Joi.array().items(Joi.alternatives().try(Joi.string(), Joi.number())),
    Joi.object({
      gte: Joi.alternatives().try(Joi.number(), Joi.date()).optional(),
      lte: Joi.alternatives().try(Joi.number(), Joi.date()).optional(),
      gt: Joi.alternatives().try(Joi.number(), Joi.date()).optional(),
      lt: Joi.alternatives().try(Joi.number(), Joi.date()).optional()
    })
  )
);

const highlightSchema = Joi.object({
  enabled: Joi.boolean().default(false),
  fields: Joi.array().items(Joi.string()).optional(),
  fragment_size: Joi.number()
    .integer()
    .min(50)
    .max(500)
    .default(SEARCH_CONFIG.DEFAULT_HIGHLIGHT_FRAGMENT_SIZE),
  number_of_fragments: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .default(SEARCH_CONFIG.DEFAULT_HIGHLIGHT_FRAGMENTS)
});

// Multi-field search validation
export const validateSearchRequest = Joi.object({
  query: Joi.string().min(1).max(1000).required(),
  // fields: Joi.array().items(Joi.string()).min(1).default([FIELD_NAMES.TITLE, FIELD_NAMES.CONTENT]),
  index: Joi.string().default(INDEX_NAMES.DOCUMENTS),
  filters: filtersSchema.optional(),
  sort: sortSchema.optional(),
  pagination: paginationSchema.optional(),
  highlight: highlightSchema.optional(),
  fuzzy: Joi.boolean().default(false),
  fuzzy_distance: Joi.alternatives()
    .try(Joi.string().valid('AUTO'), Joi.number().integer().min(0).max(2))
    .default(SEARCH_CONFIG.DEFAULT_FUZZY_DISTANCE),
  boost: Joi.object().pattern(Joi.string(), Joi.number().min(0)).optional(),
  minimum_should_match: Joi.alternatives()
    .try(Joi.string(), Joi.number().integer().min(1))
    .optional()
});

// Semantic search validation
export const validateSemanticSearchRequest = Joi.object({
  query: Joi.string().min(1).max(2000).required(),
  index: Joi.string().required(),
  threshold: Joi.number().min(0).max(1).default(0.5),
  hybridMode: Joi.boolean().default(false),
  hybridWeight: Joi.object({
    semantic: Joi.number().min(0).max(1).default(0.7),
    keyword: Joi.number().min(0).max(1).default(0.3)
  }).optional(),
  filters: filtersSchema.optional(),
  pagination: paginationSchema.optional(),
  embedding_model: Joi.string().optional(),
  vector_field: Joi.string().default(FIELD_NAMES.EMBEDDING)
});

// KNN search validation
export const validateKNNSearchRequest = Joi.object({
  vector: Joi.array().items(Joi.number()).min(1).max(2048).required(),
  k: Joi.number().integer().min(1).max(1000).required(),
  index: Joi.string().default(INDEX_NAMES.VECTORS),
  vector_field: Joi.string().default(FIELD_NAMES.EMBEDDING),
  similarity_metric: Joi.string()
    .valid(...Object.values(SIMILARITY_METRICS))
    .default(SIMILARITY_METRICS.COSINE),
  filters: filtersSchema.optional(),
  pre_filter: Joi.boolean().default(true),
  post_filter: Joi.boolean().default(false),
  num_candidates: Joi.number().integer().min(1).optional(),
  boost: Joi.number().min(0).optional(),
  rescore: Joi.object({
    window_size: Joi.number().integer().min(1).max(10000).default(100),
    query_weight: Joi.number().min(0).default(1.0),
    rescore_query_weight: Joi.number().min(0).default(1.0)
  }).optional()
});

// N-gram search validation
export const validateNgramSearchRequest = Joi.object({
  query: Joi.string().min(1).max(1000).required(),
  fields: Joi.array().items(Joi.string()).min(1).default([FIELD_NAMES.TITLE, FIELD_NAMES.CONTENT]),
  index: Joi.string(),
  filters: filtersSchema.optional(),
  pagination: paginationSchema.optional(),
  ngram_type: Joi.string().valid('ngram', 'edge_ngram', 'both').default('both'),
  min_score: Joi.number().min(0).max(1).default(0.1),
  boost: Joi.object().pattern(Joi.string(), Joi.number().min(0)).optional(),
  highlight: highlightSchema.optional()
});

// Fuzzy search validation
export const validateFuzzySearchRequest = Joi.object({
  query: Joi.string().min(1).max(1000).required(),
  fields: Joi.array().items(Joi.string()).min(1).default([FIELD_NAMES.TITLE, FIELD_NAMES.CONTENT]),
  index: Joi.string().default(INDEX_NAMES.DOCUMENTS),
  filters: filtersSchema.optional(),
  pagination: paginationSchema.optional(),
  fuzziness: Joi.alternatives()
    .try(Joi.string().valid('AUTO'), Joi.number().integer().min(0).max(2))
    .default('AUTO'),
  prefix_length: Joi.number().integer().min(0).max(10).default(0),
  max_expansions: Joi.number().integer().min(1).max(1000).default(50),
  transpositions: Joi.boolean().default(true),
  boost: Joi.object().pattern(Joi.string(), Joi.number().min(0)).optional(),
  highlight: highlightSchema.optional()
});

// Aggregation validation
const aggregationConfigSchema = Joi.object({
  type: Joi.string()
    .valid(...Object.values(AGGREGATION_TYPES))
    .required(),
  field: Joi.string().required(),
  size: Joi.number().integer().min(1).max(1000).optional(),
  interval: Joi.string().optional(), // for date_histogram
  ranges: Joi.array()
    .items(
      Joi.object({
        from: Joi.alternatives().try(Joi.number(), Joi.date()).optional(),
        to: Joi.alternatives().try(Joi.number(), Joi.date()).optional(),
        key: Joi.string().optional()
      })
    )
    .optional(), // for range aggregations
  missing: Joi.alternatives().try(Joi.string(), Joi.number()).optional(),
  order: Joi.object().pattern(Joi.string(), Joi.string().valid('asc', 'desc')).optional(),
  min_doc_count: Joi.number().integer().min(0).optional(),
  include: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).optional(),
  exclude: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).optional()
});

export const validateAggregationRequest = Joi.object({
  query: Joi.string().optional(),
  fields: Joi.array().items(Joi.string()).optional(),
  index: Joi.string().default(INDEX_NAMES.DOCUMENTS),
  filters: filtersSchema.optional(),
  aggregations: Joi.object().pattern(Joi.string(), aggregationConfigSchema).min(1).required(),
  size: Joi.number().integer().min(0).max(1000).default(0), // 0 means only aggregations, no documents
  timeout: Joi.string()
    .pattern(/^\d+[smh]$/)
    .default(SEARCH_CONFIG.SEARCH_TIMEOUT)
});

// Document indexing validation
export const validateIndexDocumentRequest = Joi.object({
  document: Joi.object().required(),
  index: Joi.string().required(),
  id: Joi.string().optional(),
  pipeline: Joi.string().optional(),
  routing: Joi.string().optional(),
  refresh: Joi.string().valid('true', 'false', 'wait_for').default('false'),
  timeout: Joi.string()
    .pattern(/^\d+[smh]$/)
    .optional(),
  version: Joi.number().integer().min(1).optional(),
  version_type: Joi.string().valid('internal', 'external', 'external_gte', 'force').optional(),
  if_seq_no: Joi.number().integer().min(0).optional(),
  if_primary_term: Joi.number().integer().min(1).optional()
});

// Bulk operations validation
export const validateBulkIndexRequest = Joi.object({
  documents: Joi.array()
    .items(
      Joi.object({
        _index: Joi.string().optional(),
        _id: Joi.string().optional(),
        _source: Joi.object().required(),
        _routing: Joi.string().optional()
      })
    )
    .min(1)
    .max(SEARCH_CONFIG.MAX_BULK_SIZE)
    .required(),
  index: Joi.string().required(),
  pipeline: Joi.string().optional(),
  refresh: Joi.string().valid('true', 'false', 'wait_for').default('false'),
  timeout: Joi.string()
    .pattern(/^\d+[smh]$/)
    .optional(),
  routing: Joi.string().optional()
});

// Document update validation
export const validateUpdateDocumentRequest = Joi.object({
  id: Joi.string().required(),
  document: Joi.object().required(),
  index: Joi.string().required(),
  upsert: Joi.object().optional(),
  script: Joi.object({
    source: Joi.string().required(),
    params: Joi.object().optional(),
    lang: Joi.string().default('painless')
  }).optional(),
  refresh: Joi.string().valid('true', 'false', 'wait_for').default('false'),
  retry_on_conflict: Joi.number().integer().min(0).max(5).default(0),
  timeout: Joi.string()
    .pattern(/^\d+[smh]$/)
    .optional(),
  if_seq_no: Joi.number().integer().min(0).optional(),
  if_primary_term: Joi.number().integer().min(1).optional()
});

// Document deletion validation
export const validateDeleteDocumentRequest = Joi.object({
  id: Joi.string().required(),
  index: Joi.string().required(),
  routing: Joi.string().optional(),
  refresh: Joi.string().valid('true', 'false', 'wait_for').default('false'),
  timeout: Joi.string()
    .pattern(/^\d+[smh]$/)
    .optional(),
  version: Joi.number().integer().min(1).optional(),
  version_type: Joi.string().valid('internal', 'external', 'external_gte', 'force').optional(),
  if_seq_no: Joi.number().integer().min(0).optional(),
  if_primary_term: Joi.number().integer().min(1).optional()
});

// Index management validation
export const validateCreateIndexRequest = Joi.object({
  name: Joi.string().required(),
  mappings: Joi.object().required(),
  settings: Joi.object().optional(),
  aliases: Joi.object().optional()
});

export const validateUpdateIndexMappingRequest = Joi.object({
  index: Joi.string().required(),
  mappings: Joi.object().required(),
  timeout: Joi.string()
    .pattern(/^\d+[smh]$/)
    .optional(),
  master_timeout: Joi.string()
    .pattern(/^\d+[smh]$/)
    .optional()
});

export const validateDeleteIndexRequest = Joi.object({
  index: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).required(),
  timeout: Joi.string()
    .pattern(/^\d+[smh]$/)
    .optional(),
  master_timeout: Joi.string()
    .pattern(/^\d+[smh]$/)
    .optional()
});

// Pipeline management validation
const pipelineProcessorSchema = Joi.object({
  lowercase: Joi.object({
    field: Joi.string().required(),
    target_field: Joi.string().optional(),
    ignore_missing: Joi.boolean().default(false)
  }).optional(),
  uppercase: Joi.object({
    field: Joi.string().required(),
    target_field: Joi.string().optional(),
    ignore_missing: Joi.boolean().default(false)
  }).optional(),
  trim: Joi.object({
    field: Joi.string().required(),
    target_field: Joi.string().optional(),
    ignore_missing: Joi.boolean().default(false)
  }).optional(),
  remove: Joi.object({
    field: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).required(),
    ignore_missing: Joi.boolean().default(false)
  }).optional(),
  rename: Joi.object({
    field: Joi.string().required(),
    target_field: Joi.string().required(),
    ignore_missing: Joi.boolean().default(false)
  }).optional(),
  set: Joi.object({
    field: Joi.string().required(),
    value: Joi.alternatives().try(Joi.string(), Joi.number(), Joi.boolean()).required(),
    override: Joi.boolean().default(true)
  }).optional(),
  script: Joi.object({
    source: Joi.string().required(),
    params: Joi.object().optional(),
    lang: Joi.string().default('painless')
  }).optional(),
  date: Joi.object({
    field: Joi.string().required(),
    target_field: Joi.string().optional(),
    formats: Joi.array().items(Joi.string()).required(),
    timezone: Joi.string().optional()
  }).optional(),
  convert: Joi.object({
    field: Joi.string().required(),
    type: Joi.string()
      .valid('integer', 'long', 'float', 'double', 'string', 'boolean', 'auto')
      .required(),
    target_field: Joi.string().optional(),
    ignore_missing: Joi.boolean().default(false)
  }).optional()
}).or('lowercase', 'uppercase', 'trim', 'remove', 'rename', 'set', 'script', 'date', 'convert');

export const validateCreatePipelineRequest = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().optional(),
  processors: Joi.array().items(pipelineProcessorSchema).min(1).required(),
  on_failure: Joi.array().items(pipelineProcessorSchema).optional(),
  version: Joi.number().integer().min(1).optional(),
  meta: Joi.object().optional()
});

export const validateUpdatePipelineRequest = Joi.object({
  id: Joi.string().required(),
  description: Joi.string().optional(),
  processors: Joi.array().items(pipelineProcessorSchema).min(1).required(),
  on_failure: Joi.array().items(pipelineProcessorSchema).optional(),
  version: Joi.number().integer().min(1).optional(),
  meta: Joi.object().optional()
});

export const validateDeletePipelineRequest = Joi.object({
  id: Joi.string().required(),
  timeout: Joi.string()
    .pattern(/^\d+[smh]$/)
    .optional(),
  master_timeout: Joi.string()
    .pattern(/^\d+[smh]$/)
    .optional()
});

// Reusable validation function (consistent with existing pattern)
export const validateJoiSchema = (schema, value) => {
  const result = schema.validate(value, {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: true
  });

  return {
    value: result.value,
    error: result.error
  };
};
