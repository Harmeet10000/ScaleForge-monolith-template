import {
  SEARCH_CONFIG,
  INDEX_NAMES,
  FIELD_NAMES,
  ANALYZER_NAMES,
  SIMILARITY_METRICS
} from '../constants/searchConstants.js';

// N-gram analyzer configuration for partial matching
export const ngramAnalyzer = {
  type: 'custom',
  tokenizer: 'standard',
  filter: ['lowercase', 'ngram_filter']
};

// Edge n-gram analyzer for autocomplete and prefix matching
export const edgeNgramAnalyzer = {
  type: 'custom',
  tokenizer: 'standard',
  filter: ['lowercase', 'edge_ngram_filter']
};

// Fuzzy analyzer with phonetic matching
export const fuzzyAnalyzer = {
  type: 'custom',
  tokenizer: 'standard',
  filter: ['lowercase', 'asciifolding', 'phonetic_filter']
};

// N-gram filter configuration
export const ngramFilter = {
  type: 'ngram',
  min_gram: 2,
  max_gram: 4
};

// Edge n-gram filter for prefix matching
export const edgeNgramFilter = {
  type: 'edge_ngram',
  min_gram: 2,
  max_gram: 10
};

// Phonetic filter for fuzzy matching
export const phoneticFilter = {
  type: 'phonetic',
  encoder: 'double_metaphone',
  replace: false
};

// Semantic analyzer configuration
export const semanticAnalyzer = {
  type: 'custom',
  tokenizer: 'standard',
  filter: ['lowercase', 'stop', 'stemmer']
};

// Index settings with analyzers
export const defaultIndexSettings = {
  analysis: {
    analyzer: {
      [ANALYZER_NAMES.NGRAM]: ngramAnalyzer,
      [ANALYZER_NAMES.EDGE_NGRAM]: edgeNgramAnalyzer,
      [ANALYZER_NAMES.FUZZY]: fuzzyAnalyzer,
      [ANALYZER_NAMES.SEMANTIC]: semanticAnalyzer
    },
    filter: {
      ngram_filter: ngramFilter,
      edge_ngram_filter: edgeNgramFilter,
      phonetic_filter: phoneticFilter
    }
  },
  number_of_shards: 1,
  number_of_replicas: 0,
  max_result_window: SEARCH_CONFIG.MAX_OFFSET + SEARCH_CONFIG.MAX_PAGE_SIZE
};

// Document index mapping
export const documentMapping = {
  properties: {
    [FIELD_NAMES.TITLE]: {
      type: 'text',
      analyzer: ANALYZER_NAMES.STANDARD,
      fields: {
        ngram: {
          type: 'text',
          analyzer: ANALYZER_NAMES.NGRAM
        },
        edge_ngram: {
          type: 'text',
          analyzer: ANALYZER_NAMES.EDGE_NGRAM
        },
        fuzzy: {
          type: 'text',
          analyzer: ANALYZER_NAMES.FUZZY
        },
        keyword: {
          type: 'keyword'
        }
      }
    },
    [FIELD_NAMES.CONTENT]: {
      type: 'text',
      analyzer: ANALYZER_NAMES.STANDARD,
      fields: {
        ngram: {
          type: 'text',
          analyzer: ANALYZER_NAMES.NGRAM
        },
        edge_ngram: {
          type: 'text',
          analyzer: ANALYZER_NAMES.EDGE_NGRAM
        },
        fuzzy: {
          type: 'text',
          analyzer: ANALYZER_NAMES.FUZZY
        },
        semantic: {
          type: 'text',
          analyzer: ANALYZER_NAMES.SEMANTIC
        }
      }
    },
    [FIELD_NAMES.EMBEDDING]: {
      type: 'dense_vector',
      dims: SEARCH_CONFIG.DEFAULT_VECTOR_DIMENSIONS,
      similarity: SEARCH_CONFIG.DEFAULT_SIMILARITY_METRIC
    },
    [FIELD_NAMES.METADATA]: {
      type: 'object',
      properties: {
        [FIELD_NAMES.CATEGORY]: {
          type: 'keyword'
        },
        [FIELD_NAMES.TAGS]: {
          type: 'keyword'
        },
        [FIELD_NAMES.USER_ID]: {
          type: 'keyword'
        },
        author: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword' }
          }
        },
        source: {
          type: 'keyword'
        },
        language: {
          type: 'keyword'
        },
        version: {
          type: 'keyword'
        }
      }
    },
    [FIELD_NAMES.CREATED_AT]: {
      type: 'date',
      format: 'strict_date_optional_time||epoch_millis'
    },
    [FIELD_NAMES.UPDATED_AT]: {
      type: 'date',
      format: 'strict_date_optional_time||epoch_millis'
    },
    status: {
      type: 'keyword'
    },
    priority: {
      type: 'integer'
    },
    score: {
      type: 'float'
    }
  }
};

// Vector-specific index mapping for pure vector search
export const vectorMapping = {
  properties: {
    [FIELD_NAMES.EMBEDDING]: {
      type: 'dense_vector',
      dims: SEARCH_CONFIG.DEFAULT_VECTOR_DIMENSIONS,
      similarity: SEARCH_CONFIG.DEFAULT_SIMILARITY_METRIC
    },
    document_id: {
      type: 'keyword'
    },
    text_snippet: {
      type: 'text',
      index: false
    },
    [FIELD_NAMES.METADATA]: {
      type: 'object',
      properties: {
        [FIELD_NAMES.CATEGORY]: { type: 'keyword' },
        [FIELD_NAMES.TAGS]: { type: 'keyword' },
        embedding_model: { type: 'keyword' },
        embedding_version: { type: 'keyword' }
      }
    },
    [FIELD_NAMES.CREATED_AT]: {
      type: 'date',
      format: 'strict_date_optional_time||epoch_millis'
    }
  }
};

// User index mapping for user-related searches
export const userMapping = {
  properties: {
    username: {
      type: 'text',
      fields: {
        keyword: { type: 'keyword' },
        ngram: {
          type: 'text',
          analyzer: ANALYZER_NAMES.NGRAM
        },
        edge_ngram: {
          type: 'text',
          analyzer: ANALYZER_NAMES.EDGE_NGRAM
        },
        fuzzy: {
          type: 'text',
          analyzer: ANALYZER_NAMES.FUZZY
        }
      }
    },
    email: {
      type: 'text',
      fields: {
        keyword: { type: 'keyword' }
      }
    },
    profile: {
      type: 'object',
      properties: {
        first_name: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword' },
            ngram: {
              type: 'text',
              analyzer: ANALYZER_NAMES.NGRAM
            },
            edge_ngram: {
              type: 'text',
              analyzer: ANALYZER_NAMES.EDGE_NGRAM
            },
            fuzzy: {
              type: 'text',
              analyzer: ANALYZER_NAMES.FUZZY
            }
          }
        },
        last_name: {
          type: 'text',
          fields: {
            keyword: { type: 'keyword' },
            ngram: {
              type: 'text',
              analyzer: ANALYZER_NAMES.NGRAM
            },
            edge_ngram: {
              type: 'text',
              analyzer: ANALYZER_NAMES.EDGE_NGRAM
            },
            fuzzy: {
              type: 'text',
              analyzer: ANALYZER_NAMES.FUZZY
            }
          }
        },
        bio: {
          type: 'text',
          analyzer: ANALYZER_NAMES.SEMANTIC
        },
        location: { type: 'keyword' },
        department: { type: 'keyword' },
        role: { type: 'keyword' }
      }
    },
    preferences: {
      type: 'object',
      properties: {
        language: { type: 'keyword' },
        timezone: { type: 'keyword' },
        notifications: { type: 'boolean' }
      }
    },
    [FIELD_NAMES.CREATED_AT]: {
      type: 'date',
      format: 'strict_date_optional_time||epoch_millis'
    },
    [FIELD_NAMES.UPDATED_AT]: {
      type: 'date',
      format: 'strict_date_optional_time||epoch_millis'
    },
    last_login: {
      type: 'date',
      format: 'strict_date_optional_time||epoch_millis'
    },
    active: {
      type: 'boolean'
    }
  }
};

// Log index mapping for application logs
export const logMapping = {
  properties: {
    timestamp: {
      type: 'date',
      format: 'strict_date_optional_time||epoch_millis'
    },
    level: {
      type: 'keyword'
    },
    message: {
      type: 'text',
      fields: {
        keyword: { type: 'keyword' }
      }
    },
    service: {
      type: 'keyword'
    },
    module: {
      type: 'keyword'
    },
    [FIELD_NAMES.USER_ID]: {
      type: 'keyword'
    },
    request_id: {
      type: 'keyword'
    },
    error: {
      type: 'object',
      properties: {
        code: { type: 'keyword' },
        message: { type: 'text' },
        stack: { type: 'text', index: false }
      }
    },
    performance: {
      type: 'object',
      properties: {
        duration: { type: 'long' },
        memory_usage: { type: 'long' },
        cpu_usage: { type: 'float' }
      }
    }
  }
};

// Index configurations combining mappings and settings
export const indexConfigurations = {
  [INDEX_NAMES.DOCUMENTS]: {
    mappings: documentMapping,
    settings: defaultIndexSettings
  },
  [INDEX_NAMES.VECTORS]: {
    mappings: vectorMapping,
    settings: {
      ...defaultIndexSettings,
      // Optimize for vector operations
      number_of_shards: 1,
      number_of_replicas: 0
    }
  },
  [INDEX_NAMES.USERS]: {
    mappings: userMapping,
    settings: defaultIndexSettings
  },
  [INDEX_NAMES.LOGS]: {
    mappings: logMapping,
    settings: {
      ...defaultIndexSettings,
      // Optimize for time-series data
      number_of_shards: 2,
      number_of_replicas: 0,
      'index.lifecycle.name': 'logs_policy',
      'index.lifecycle.rollover_alias': 'logs'
    }
  }
};

// Search configuration with default values
export const searchConfiguration = {
  pagination: {
    defaultLimit: SEARCH_CONFIG.DEFAULT_PAGE_SIZE,
    maxLimit: SEARCH_CONFIG.MAX_PAGE_SIZE,
    maxOffset: SEARCH_CONFIG.MAX_OFFSET
  },

  embedding: {
    defaultModel: 'sentence-transformers/all-MiniLM-L6-v2',
    vectorDimensions: SEARCH_CONFIG.DEFAULT_VECTOR_DIMENSIONS,
    similarityMetric: SEARCH_CONFIG.DEFAULT_SIMILARITY_METRIC,
    availableModels: [
      'sentence-transformers/all-MiniLM-L6-v2',
      'sentence-transformers/all-mpnet-base-v2',
      'text-embedding-ada-002'
    ]
  },

  search: {
    timeout: SEARCH_CONFIG.SEARCH_TIMEOUT,
    fuzzyDistance: SEARCH_CONFIG.DEFAULT_FUZZY_DISTANCE,
    highlightFragmentSize: SEARCH_CONFIG.DEFAULT_HIGHLIGHT_FRAGMENT_SIZE,
    highlightFragments: SEARCH_CONFIG.DEFAULT_HIGHLIGHT_FRAGMENTS,
    defaultFields: [FIELD_NAMES.TITLE, FIELD_NAMES.CONTENT],
    boostFields: {
      [FIELD_NAMES.TITLE]: 2.0,
      [FIELD_NAMES.CONTENT]: 1.0
    }
  },

  knn: {
    defaultK: 10,
    maxK: 100,
    candidatesMultiplier: SEARCH_CONFIG.DEFAULT_KNN_CANDIDATES_MULTIPLIER,
    defaultSimilarity: SIMILARITY_METRICS.COSINE,
    availableSimilarities: Object.values(SIMILARITY_METRICS)
  },

  aggregations: {
    maxBuckets: 1000,
    defaultSize: 10,
    maxSize: 100
  },

  bulk: {
    defaultSize: SEARCH_CONFIG.BULK_SIZE,
    maxSize: SEARCH_CONFIG.MAX_BULK_SIZE,
    timeout: '5m',
    refreshPolicy: 'wait_for'
  }
};

// Default pipeline configurations
export const defaultPipelineConfigurations = {
  text_processing: {
    processors: [
      {
        lowercase: {
          field: FIELD_NAMES.TITLE
        }
      },
      {
        trim: {
          field: FIELD_NAMES.CONTENT
        }
      },
      {
        remove: {
          field: 'temp_field',
          ignore_missing: true
        }
      },
      {
        set: {
          field: FIELD_NAMES.CREATED_AT,
          value: '{{_ingest.timestamp}}'
        }
      }
    ]
  },

  embedding_generation: {
    processors: [
      {
        script: {
          source: `
            // Placeholder for embedding generation
            // This would integrate with actual embedding service
            ctx.${FIELD_NAMES.EMBEDDING} = new ArrayList();
            for (int i = 0; i < ${SEARCH_CONFIG.DEFAULT_VECTOR_DIMENSIONS}; i++) {
              ctx.${FIELD_NAMES.EMBEDDING}.add(Math.random());
            }
          `
        }
      }
    ]
  },

  user_processing: {
    processors: [
      {
        lowercase: {
          field: 'username'
        }
      },
      {
        lowercase: {
          field: 'email'
        }
      },
      {
        set: {
          field: FIELD_NAMES.CREATED_AT,
          value: '{{_ingest.timestamp}}'
        }
      }
    ]
  }
};
