import { logger } from '../../utils/logger.js';

// Query builders
export const buildMultiFieldQuery = (searchParams) => {
  const {
    query,
    fields,
    filters,
    sort,
    pagination,
    highlight,
    fuzzy,
    partialMatch,
    typoTolerance,
    searchMode = 'best_fields'
  } = searchParams;

  const searchQuery = {
    query: {
      bool: {
        must: [],
        should: [],
        filter: []
      }
    },
    from: ((pagination?.page || 1) - 1) * (pagination?.limit || 20),
    size: pagination?.limit || 20
  };

  // Multi-field query with enhanced n-gram and fuzzy support
  if (query && fields && fields.length > 0) {
    const queries = [];

    // Standard multi-match query
    queries.push({
      multi_match: {
        query,
        fields,
        type: searchMode,
        fuzziness: fuzzy ? 'AUTO' : undefined,
        boost: 3.0
      }
    });

    // N-gram queries for partial matching
    if (partialMatch) {
      const ngramFields = fields.map((field) => `${field}.ngram`);
      queries.push({
        multi_match: {
          query,
          fields: ngramFields,
          type: 'best_fields',
          boost: 2.0
        }
      });

      // Edge n-gram for prefix matching
      const edgeNgramFields = fields.map((field) => `${field}.edge_ngram`);
      queries.push({
        multi_match: {
          query,
          fields: edgeNgramFields,
          type: 'phrase_prefix',
          boost: 1.5
        }
      });
    }

    // Fuzzy matching with phonetic analysis
    if (typoTolerance) {
      const fuzzyFields = fields.map((field) => `${field}.fuzzy`);
      queries.push({
        multi_match: {
          query,
          fields: fuzzyFields,
          type: 'best_fields',
          fuzziness: 'AUTO',
          boost: 1.0
        }
      });
    }

    // Use should queries for scoring multiple approaches
    if (queries.length > 1) {
      searchQuery.query.bool.should = queries;
      searchQuery.query.bool.minimum_should_match = 1;
    } else {
      searchQuery.query.bool.must.push(queries[0]);
    }
  } else if (query) {
    // If no specific fields provided, use query_string with fuzzy support
    searchQuery.query.bool.must.push({
      query_string: {
        query: fuzzy ? `${query}~` : query,
        default_operator: 'AND',
        analyze_wildcard: true,
        allow_leading_wildcard: partialMatch
      }
    });
  } else {
    // If no query provided, match all documents
    searchQuery.query.bool.must.push({ match_all: {} });
  }

  // Filters
  if (filters && Object.keys(filters).length > 0) {
    Object.entries(filters).forEach(([field, value]) => {
      if (Array.isArray(value)) {
        // Handle array values with terms query
        searchQuery.query.bool.filter.push({
          terms: { [field]: value }
        });
      } else if (typeof value === 'object' && value !== null) {
        // Handle range queries
        if (
          value.gte !== undefined ||
          value.lte !== undefined ||
          value.gt !== undefined ||
          value.lt !== undefined
        ) {
          searchQuery.query.bool.filter.push({
            range: { [field]: value }
          });
        } else {
          // Handle nested object filters
          searchQuery.query.bool.filter.push({
            term: { [field]: value }
          });
        }
      } else {
        // Handle simple term filters
        searchQuery.query.bool.filter.push({
          term: { [field]: value }
        });
      }
    });
  }

  // Sorting
  if (sort && Object.keys(sort).length > 0) {
    searchQuery.sort = Object.entries(sort).map(([field, order]) => ({
      [field]: { order: order.toLowerCase() }
    }));
  }

  // Highlighting
  if (highlight && fields && fields.length > 0) {
    searchQuery.highlight = {
      fields: fields.reduce((acc, field) => {
        acc[field] = {};
        return acc;
      }, {})
    };
  }
  // logger.debug('Built multi-field query', { meta: { searchQuery } });
  return searchQuery;
};

export const buildSemanticQuery = (vector, options) => {
  const { filters, threshold, hybridMode, pagination, textQuery, fields } = options;

  const query = {
    query: {
      bool: {
        must: [],
        filter: []
      }
    },
    from: ((pagination?.page || 1) - 1) * (pagination?.limit || 20),
    size: pagination?.limit || 20
  };

  // Vector similarity query using script_score
  const vectorQuery = {
    script_score: {
      query: { match_all: {} },
      script: {
        source:
          "doc['embedding'].isEmpty() ? 0 : dotProduct(params.query_vector, 'embedding') + 1.0",
        params: {
          query_vector: vector
        }
      },
      min_score: threshold || 0.5
    }
  };

  // Hybrid mode: combine vector search with text search
  if (hybridMode && textQuery && fields) {
    query.query = {
      bool: {
        should: [
          vectorQuery,
          {
            multi_match: {
              query: textQuery,
              fields,
              type: 'best_fields'
            }
          }
        ],
        minimum_should_match: 1,
        filter: []
      }
    };
  } else {
    query.query.bool.must.push(vectorQuery);
  }

  // Filters
  if (filters && Object.keys(filters).length > 0) {
    Object.entries(filters).forEach(([field, value]) => {
      if (Array.isArray(value)) {
        query.query.bool.filter.push({
          terms: { [field]: value }
        });
      } else {
        query.query.bool.filter.push({
          term: { [field]: value }
        });
      }
    });
  }

  return query;
};

export const buildKNNQuery = (vector, k, options) => {
  const { filters, similarityMetric, preFilter, postFilter, field = 'embedding' } = options;

  const knnQuery = {
    knn: {
      field,
      query_vector: vector,
      k,
      num_candidates: Math.max(k * 10, 100), // Ensure reasonable number of candidates
      similarity: similarityMetric || 'cosine'
    },
    size: k
  };

  // Pre-filtering (applied during the KNN search)
  if (preFilter && filters && Object.keys(filters).length > 0) {
    knnQuery.knn.filter = {
      bool: {
        filter: Object.entries(filters).map(([field_, value]) => {
          if (Array.isArray(value)) {
            return { terms: { [field_]: value } };
          }
          return { term: { [field_]: value } };
        })
      }
    };
  }

  // Post-filtering (applied after KNN search)
  if (postFilter && filters && Object.keys(filters).length > 0 && !preFilter) {
    knnQuery.post_filter = {
      bool: {
        filter: Object.entries(filters).map(([field_, value]) => {
          if (Array.isArray(value)) {
            return { terms: { [field_]: value } };
          }
          return { term: { [field_]: value } };
        })
      }
    };
  }

  return knnQuery;
};

export const buildAggregationQuery = (aggregations) => {
  const aggQuery = {};

  Object.entries(aggregations).forEach(([name, config]) => {
    switch (config.type) {
      case 'terms':
        aggQuery[name] = {
          terms: {
            field: config.field,
            size: config.size || 10,
            order: config.order || { _count: 'desc' }
          }
        };
        break;

      case 'date_histogram':
        aggQuery[name] = {
          date_histogram: {
            field: config.field,
            calendar_interval: config.interval || 'day',
            format: config.format || 'yyyy-MM-dd',
            min_doc_count: config.min_doc_count || 0
          }
        };
        break;

      case 'range':
        aggQuery[name] = {
          range: {
            field: config.field,
            ranges: config.ranges || []
          }
        };
        break;

      case 'stats':
        aggQuery[name] = {
          stats: {
            field: config.field
          }
        };
        break;

      case 'histogram':
        aggQuery[name] = {
          histogram: {
            field: config.field,
            interval: config.interval || 1,
            min_doc_count: config.min_doc_count || 0
          }
        };
        break;

      case 'avg':
        aggQuery[name] = {
          avg: {
            field: config.field
          }
        };
        break;

      case 'sum':
        aggQuery[name] = {
          sum: {
            field: config.field
          }
        };
        break;

      case 'min':
        aggQuery[name] = {
          min: {
            field: config.field
          }
        };
        break;

      case 'max':
        aggQuery[name] = {
          max: {
            field: config.field
          }
        };
        break;

      case 'cardinality':
        aggQuery[name] = {
          cardinality: {
            field: config.field,
            precision_threshold: config.precision_threshold || 3000
          }
        };
        break;

      default:
        logger.warn('Unknown aggregation type', { type: config.type, name });
    }

    // Handle nested aggregations
    if (config.aggs) {
      aggQuery[name].aggs = buildAggregationQuery(config.aggs);
    }
  });

  return aggQuery;
};

// Build n-gram specific query for partial matching and typo tolerance
export const buildNgramQuery = (searchParams) => {
  const {
    query,
    fields,
    filters,
    pagination,
    ngramType, // 'ngram', 'edge_ngram', or 'both'
    minScore
  } = searchParams;

  const searchQuery = {
    query: {
      bool: {
        should: [],
        filter: [],
        minimum_should_match: 1
      }
    },
    from: ((pagination?.page || 1) - 1) * (pagination?.limit || 20),
    size: pagination?.limit || 20,
    min_score: minScore
  };

  if (query && fields && fields.length > 0) {
    // N-gram matching for partial text
    if (ngramType === 'ngram' || ngramType === 'both') {
      const ngramFields = fields.map((field) => `${field}.ngram`);
      searchQuery.query.bool.should.push({
        multi_match: {
          query,
          fields: ngramFields,
          type: 'best_fields',
          boost: 2.0
        }
      });
    }

    // Edge n-gram matching for prefix/autocomplete
    if (ngramType === 'edge_ngram' || ngramType === 'both') {
      const edgeNgramFields = fields.map((field) => `${field}.edge_ngram`);
      searchQuery.query.bool.should.push({
        multi_match: {
          query,
          fields: edgeNgramFields,
          type: 'phrase_prefix',
          boost: 1.5
        }
      });
    }

    // Fuzzy matching for typo tolerance
    const fuzzyFields = fields.map((field) => `${field}.fuzzy`);
    searchQuery.query.bool.should.push({
      multi_match: {
        query,
        fields: fuzzyFields,
        type: 'best_fields',
        fuzziness: 'AUTO',
        boost: 1.0
      }
    });
  }

  // Apply filters
  if (filters && Object.keys(filters).length > 0) {
    Object.entries(filters).forEach(([field, value]) => {
      if (Array.isArray(value)) {
        searchQuery.query.bool.filter.push({
          terms: { [field]: value }
        });
      } else {
        searchQuery.query.bool.filter.push({
          term: { [field]: value }
        });
      }
    });
  }
  // logger.debug('Built ngram query', { meta: { searchQuery } });
  return searchQuery;
};

// Build fuzzy search query with advanced typo tolerance
export const buildFuzzyQuery = (searchParams) => {
  const {
    query,
    fields,
    filters,
    pagination,
    fuzziness = 'AUTO',
    prefixLength = 0,
    maxExpansions = 50,
    transpositions = true
  } = searchParams;

  const searchQuery = {
    query: {
      bool: {
        should: [],
        filter: [],
        minimum_should_match: 1
      }
    },
    from: ((pagination?.page || 1) - 1) * (pagination?.limit || 20),
    size: pagination?.limit || 20
  };

  if (query && fields && fields.length > 0) {
    // Standard fuzzy matching
    fields.forEach((field) => {
      searchQuery.query.bool.should.push({
        fuzzy: {
          [field]: {
            value: query,
            fuzziness,
            prefix_length: prefixLength,
            max_expansions: maxExpansions,
            transpositions,
            boost: 2.0
          }
        }
      });
    });

    // Phonetic fuzzy matching
    const fuzzyFields = fields.map((field) => `${field}.fuzzy`);
    searchQuery.query.bool.should.push({
      multi_match: {
        query,
        fields: fuzzyFields,
        type: 'best_fields',
        boost: 1.5
      }
    });

    // Wildcard matching for partial terms
    fields.forEach((field) => {
      searchQuery.query.bool.should.push({
        wildcard: {
          [field]: {
            value: `*${query.toLowerCase()}*`,
            boost: 1.0
          }
        }
      });
    });
  }

  // Apply filters
  if (filters && Object.keys(filters).length > 0) {
    Object.entries(filters).forEach(([field, value]) => {
      if (Array.isArray(value)) {
        searchQuery.query.bool.filter.push({
          terms: { [field]: value }
        });
      } else {
        searchQuery.query.bool.filter.push({
          term: { [field]: value }
        });
      }
    });
  }

  return searchQuery;
};
