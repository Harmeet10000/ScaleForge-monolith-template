import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateSearchRequest,
  validateSemanticSearchRequest,
  validateKNNSearchRequest,
  validateAggregationRequest,
  validateIndexDocumentRequest,
  validateBulkIndexRequest,
  validateCreateIndexRequest,
  // validateUpdateDocumentRequest,
  // validateDeleteDocumentRequest,
  // validateUpdateIndexMappingRequest,
  // validateUpdatePipelineRequest,
  // validateDeletePipelineRequest,
  validateDeleteIndexRequest,
  validateCreatePipelineRequest,
  validateJoiSchema
} from '../../src/validations/searchValidation.js';

describe('Search Validation Schemas', () => {
  describe('validateSearchRequest', () => {
    it('should validate a basic search request', () => {
      const validRequest = {
        query: 'test search',
        fields: ['title', 'content']
      };

      const { error, value } = validateJoiSchema(validateSearchRequest, validRequest);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.query, 'test search');
      assert.deepStrictEqual(value.fields, ['title', 'content']);
      assert.strictEqual(value.index, 'documents'); // default value
    });

    it('should apply default values correctly', () => {
      const minimalRequest = {
        query: 'test'
      };

      const { error, value } = validateJoiSchema(validateSearchRequest, minimalRequest);

      assert.strictEqual(error, undefined);
      assert.deepStrictEqual(value.fields, ['title', 'content']);
      assert.strictEqual(value.index, 'documents');
      assert.strictEqual(value.fuzzy, false);
      assert.strictEqual(value.fuzzy_distance, 'AUTO');
    });

    it('should validate pagination parameters', () => {
      const requestWithPagination = {
        query: 'test',
        pagination: {
          page: 2,
          limit: 50
        }
      };

      const { error, value } = validateJoiSchema(validateSearchRequest, requestWithPagination);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.pagination.page, 2);
      assert.strictEqual(value.pagination.limit, 50);
    });

    it('should validate sort parameters', () => {
      const requestWithSort = {
        query: 'test',
        sort: {
          created_at: 'desc',
          'title.keyword': { order: 'asc', missing: '_last' }
        }
      };

      const { error, value } = validateJoiSchema(validateSearchRequest, requestWithSort);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.sort['created_at'], 'desc');
      assert.deepStrictEqual(value.sort['title.keyword'], { order: 'asc', missing: '_last' });
    });

    it('should validate filters', () => {
      const requestWithFilters = {
        query: 'test',
        filters: {
          category: 'technology',
          tags: ['ai', 'ml'],
          created_at: {
            gte: '2023-01-01',
            lte: '2023-12-31'
          }
        }
      };

      const { error, value } = validateJoiSchema(validateSearchRequest, requestWithFilters);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.filters.category, 'technology');
      assert.deepStrictEqual(value.filters.tags, ['ai', 'ml']);
    });

    it('should reject invalid query', () => {
      const invalidRequest = {
        query: '', // empty query
        fields: ['title']
      };

      const { error } = validateJoiSchema(validateSearchRequest, invalidRequest);

      assert.notStrictEqual(error, undefined);
      assert(error.details.some((detail) => detail.path.includes('query')));
    });

    it('should reject invalid pagination', () => {
      const invalidRequest = {
        query: 'test',
        pagination: {
          page: 0, // invalid page number
          limit: 1000 // exceeds max limit
        }
      };

      const { error } = validateJoiSchema(validateSearchRequest, invalidRequest);

      assert.notStrictEqual(error, undefined);
      assert(
        error.details.some(
          (detail) => detail.path.includes('page') || detail.path.includes('limit')
        )
      );
    });
  });

  describe('validateSemanticSearchRequest', () => {
    it('should validate a basic semantic search request', () => {
      const validRequest = {
        query: 'find documents about artificial intelligence'
      };

      const { error, value } = validateJoiSchema(validateSemanticSearchRequest, validRequest);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.query, 'find documents about artificial intelligence');
      assert.strictEqual(value.index, 'vectors');
      assert.strictEqual(value.threshold, 0.5);
      assert.strictEqual(value.hybridMode, false);
    });

    it('should validate hybrid mode configuration', () => {
      const hybridRequest = {
        query: 'machine learning algorithms',
        hybridMode: true,
        hybridWeight: {
          semantic: 0.8,
          keyword: 0.2
        }
      };

      const { error, value } = validateJoiSchema(validateSemanticSearchRequest, hybridRequest);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.hybridMode, true);
      assert.strictEqual(value.hybridWeight.semantic, 0.8);
      assert.strictEqual(value.hybridWeight.keyword, 0.2);
    });

    it('should reject invalid threshold', () => {
      const invalidRequest = {
        query: 'test',
        threshold: 1.5 // exceeds max value
      };

      const { error } = validateJoiSchema(validateSemanticSearchRequest, invalidRequest);

      assert.notStrictEqual(error, undefined);
      assert(error.details.some((detail) => detail.path.includes('threshold')));
    });

    it('should reject query that is too long', () => {
      const invalidRequest = {
        query: 'a'.repeat(2001) // exceeds max length
      };

      const { error } = validateJoiSchema(validateSemanticSearchRequest, invalidRequest);

      assert.notStrictEqual(error, undefined);
      assert(error.details.some((detail) => detail.path.includes('query')));
    });
  });

  describe('validateKNNSearchRequest', () => {
    it('should validate a basic KNN search request', () => {
      const validRequest = {
        vector: [0.1, 0.2, 0.3, 0.4, 0.5],
        k: 10
      };

      const { error, value } = validateJoiSchema(validateKNNSearchRequest, validRequest);

      assert.strictEqual(error, undefined);
      assert.deepStrictEqual(value.vector, [0.1, 0.2, 0.3, 0.4, 0.5]);
      assert.strictEqual(value.k, 10);
      assert.strictEqual(value.similarity_metric, 'cosine');
      assert.strictEqual(value.pre_filter, true);
    });

    it('should validate different similarity metrics', () => {
      const request = {
        vector: [0.1, 0.2, 0.3],
        k: 5,
        similarity_metric: 'l2_norm'
      };

      const { error, value } = validateJoiSchema(validateKNNSearchRequest, request);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.similarity_metric, 'l2_norm');
    });

    it('should validate rescore configuration', () => {
      const requestWithRescore = {
        vector: [0.1, 0.2, 0.3],
        k: 5,
        rescore: {
          window_size: 50,
          query_weight: 1.2,
          rescore_query_weight: 0.8
        }
      };

      const { error, value } = validateJoiSchema(validateKNNSearchRequest, requestWithRescore);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.rescore.window_size, 50);
      assert.strictEqual(value.rescore.query_weight, 1.2);
    });

    it('should reject empty vector', () => {
      const invalidRequest = {
        vector: [], // empty vector
        k: 10
      };

      const { error } = validateJoiSchema(validateKNNSearchRequest, invalidRequest);

      assert.notStrictEqual(error, undefined);
      assert(error.details.some((detail) => detail.path.includes('vector')));
    });

    it('should reject invalid k value', () => {
      const invalidRequest = {
        vector: [0.1, 0.2, 0.3],
        k: 0 // invalid k value
      };

      const { error } = validateJoiSchema(validateKNNSearchRequest, invalidRequest);

      assert.notStrictEqual(error, undefined);
      assert(error.details.some((detail) => detail.path.includes('k')));
    });

    it('should reject invalid similarity metric', () => {
      const invalidRequest = {
        vector: [0.1, 0.2, 0.3],
        k: 5,
        similarity_metric: 'invalid_metric'
      };

      const { error } = validateJoiSchema(validateKNNSearchRequest, invalidRequest);

      assert.notStrictEqual(error, undefined);
      assert(error.details.some((detail) => detail.path.includes('similarity_metric')));
    });
  });

  describe('validateAggregationRequest', () => {
    it('should validate a basic aggregation request', () => {
      const validRequest = {
        aggregations: {
          categories: {
            type: 'terms',
            field: 'category',
            size: 10
          }
        }
      };

      const { error, value } = validateJoiSchema(validateAggregationRequest, validRequest);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.aggregations.categories.type, 'terms');
      assert.strictEqual(value.aggregations.categories.field, 'category');
      assert.strictEqual(value.size, 0); // default value
    });

    it('should validate date histogram aggregation', () => {
      const request = {
        aggregations: {
          timeline: {
            type: 'date_histogram',
            field: 'created_at',
            interval: 'day'
          }
        }
      };

      const { error, value } = validateJoiSchema(validateAggregationRequest, request);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.aggregations.timeline.type, 'date_histogram');
      assert.strictEqual(value.aggregations.timeline.interval, 'day');
    });

    it('should validate range aggregation', () => {
      const request = {
        aggregations: {
          price_ranges: {
            type: 'range',
            field: 'price',
            ranges: [
              { to: 100, key: 'cheap' },
              { from: 100, to: 500, key: 'moderate' },
              { from: 500, key: 'expensive' }
            ]
          }
        }
      };

      const { error, value } = validateJoiSchema(validateAggregationRequest, request);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.aggregations.price_ranges.type, 'range');
      assert.strictEqual(value.aggregations.price_ranges.ranges.length, 3);
    });

    it('should validate stats aggregation', () => {
      const request = {
        aggregations: {
          score_stats: {
            type: 'stats',
            field: 'score'
          }
        }
      };

      const { error, value } = validateJoiSchema(validateAggregationRequest, request);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.aggregations.score_stats.type, 'stats');
    });

    it('should reject empty aggregations', () => {
      const invalidRequest = {
        aggregations: {} // empty aggregations
      };

      const { error } = validateJoiSchema(validateAggregationRequest, invalidRequest);

      assert.notStrictEqual(error, undefined);
      assert(error.details.some((detail) => detail.path.includes('aggregations')));
    });

    it('should reject invalid aggregation type', () => {
      const invalidRequest = {
        aggregations: {
          test: {
            type: 'invalid_type',
            field: 'test_field'
          }
        }
      };

      const { error } = validateJoiSchema(validateAggregationRequest, invalidRequest);

      assert.notStrictEqual(error, undefined);
      assert(error.details.some((detail) => detail.path.includes('type')));
    });
  });

  describe('validateIndexDocumentRequest', () => {
    it('should validate a basic document indexing request', () => {
      const validRequest = {
        document: {
          title: 'Test Document',
          content: 'This is a test document',
          category: 'test'
        },
        index: 'test_index'
      };

      const { error, value } = validateJoiSchema(validateIndexDocumentRequest, validRequest);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.document.title, 'Test Document');
      assert.strictEqual(value.index, 'test_index');
      assert.strictEqual(value.refresh, 'false'); // default value
    });

    it('should validate document with optional parameters', () => {
      const request = {
        document: { title: 'Test' },
        index: 'test_index',
        id: 'doc_123',
        pipeline: 'text_processing',
        routing: 'user_123',
        refresh: 'wait_for',
        version: 1,
        version_type: 'external'
      };

      const { error, value } = validateJoiSchema(validateIndexDocumentRequest, request);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.id, 'doc_123');
      assert.strictEqual(value.pipeline, 'text_processing');
      assert.strictEqual(value.routing, 'user_123');
      assert.strictEqual(value.refresh, 'wait_for');
      assert.strictEqual(value.version, 1);
      assert.strictEqual(value.version_type, 'external');
    });

    it('should reject missing required fields', () => {
      const invalidRequest = {
        document: { title: 'Test' }
        // missing index
      };

      const { error } = validateJoiSchema(validateIndexDocumentRequest, invalidRequest);

      assert.notStrictEqual(error, undefined);
      assert(error.details.some((detail) => detail.path.includes('index')));
    });

    it('should reject invalid refresh value', () => {
      const invalidRequest = {
        document: { title: 'Test' },
        index: 'test_index',
        refresh: 'invalid_value'
      };

      const { error } = validateJoiSchema(validateIndexDocumentRequest, invalidRequest);

      assert.notStrictEqual(error, undefined);
      assert(error.details.some((detail) => detail.path.includes('refresh')));
    });
  });

  describe('validateBulkIndexRequest', () => {
    it('should validate a basic bulk index request', () => {
      const validRequest = {
        documents: [
          {
            _source: { title: 'Doc 1', content: 'Content 1' }
          },
          {
            _id: 'doc_2',
            _source: { title: 'Doc 2', content: 'Content 2' }
          }
        ],
        index: 'test_index'
      };

      const { error, value } = validateJoiSchema(validateBulkIndexRequest, validRequest);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.documents.length, 2);
      assert.strictEqual(value.index, 'test_index');
      assert.strictEqual(value.refresh, 'false');
    });

    it('should validate bulk request with optional parameters', () => {
      const request = {
        documents: [
          {
            _index: 'custom_index',
            _id: 'doc_1',
            _routing: 'user_1',
            _source: { title: 'Test' }
          }
        ],
        index: 'default_index',
        pipeline: 'bulk_processing',
        refresh: 'true',
        routing: 'default_routing'
      };

      const { error, value } = validateJoiSchema(validateBulkIndexRequest, request);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.pipeline, 'bulk_processing');
      assert.strictEqual(value.refresh, 'true');
      assert.strictEqual(value.routing, 'default_routing');
    });

    it('should reject empty documents array', () => {
      const invalidRequest = {
        documents: [], // empty array
        index: 'test_index'
      };

      const { error } = validateJoiSchema(validateBulkIndexRequest, invalidRequest);

      assert.notStrictEqual(error, undefined);
      assert(error.details.some((detail) => detail.path.includes('documents')));
    });

    it('should reject documents without _source', () => {
      const invalidRequest = {
        documents: [
          {
            _id: 'doc_1'
            // missing _source
          }
        ],
        index: 'test_index'
      };

      const { error } = validateJoiSchema(validateBulkIndexRequest, invalidRequest);

      assert.notStrictEqual(error, undefined);
      assert(error.details.some((detail) => detail.path.includes('_source')));
    });
  });

  describe('validateCreatePipelineRequest', () => {
    it('should validate a basic pipeline creation request', () => {
      const validRequest = {
        id: 'text_processing',
        processors: [
          {
            lowercase: {
              field: 'title'
            }
          },
          {
            trim: {
              field: 'content'
            }
          }
        ]
      };

      const { error, value } = validateJoiSchema(validateCreatePipelineRequest, validRequest);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.id, 'text_processing');
      assert.strictEqual(value.processors.length, 2);
    });

    it('should validate pipeline with all processor types', () => {
      const request = {
        id: 'comprehensive_pipeline',
        description: 'A comprehensive text processing pipeline',
        processors: [
          { lowercase: { field: 'title' } },
          { uppercase: { field: 'category' } },
          { trim: { field: 'content' } },
          { remove: { field: 'temp_field' } },
          { rename: { field: 'old_name', target_field: 'new_name' } },
          { set: { field: 'processed', value: true } },
          { script: { source: 'ctx.timestamp = new Date().getTime()' } },
          { convert: { field: 'score', type: 'float' } }
        ],
        version: 1,
        meta: { author: 'test' }
      };

      const { error, value } = validateJoiSchema(validateCreatePipelineRequest, request);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.description, 'A comprehensive text processing pipeline');
      assert.strictEqual(value.processors.length, 8);
      assert.strictEqual(value.version, 1);
    });

    it('should validate pipeline with on_failure processors', () => {
      const request = {
        id: 'pipeline_with_failure_handling',
        processors: [{ lowercase: { field: 'title' } }],
        on_failure: [{ set: { field: 'error', value: 'Processing failed' } }]
      };

      const { error, value } = validateJoiSchema(validateCreatePipelineRequest, request);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.on_failure.length, 1);
    });

    it('should reject pipeline without processors', () => {
      const invalidRequest = {
        id: 'empty_pipeline',
        processors: [] // empty processors
      };

      const { error } = validateJoiSchema(validateCreatePipelineRequest, invalidRequest);

      assert.notStrictEqual(error, undefined);
      assert(error.details.some((detail) => detail.path.includes('processors')));
    });

    it('should reject invalid processor configuration', () => {
      const invalidRequest = {
        id: 'invalid_pipeline',
        processors: [
          {
            lowercase: {
              // missing required field
            }
          }
        ]
      };

      const { error } = validateJoiSchema(validateCreatePipelineRequest, invalidRequest);

      assert.notStrictEqual(error, undefined);
      assert(error.details.some((detail) => detail.path.includes('field')));
    });
  });

  describe('validateJoiSchema function', () => {
    it('should return validation result with correct structure', () => {
      const schema = validateSearchRequest;
      const validData = { query: 'test' };

      const result = validateJoiSchema(schema, validData);

      // assert(result.hasOwnProperty('value'));
      // assert(result.hasOwnProperty('error'));
      assert.strictEqual(result.error, undefined);
      assert.strictEqual(result.value.query, 'test');
    });

    it('should return error for invalid data', () => {
      const schema = validateSearchRequest;
      const invalidData = { query: '' }; // empty query

      const result = validateJoiSchema(schema, invalidData);

      assert.notStrictEqual(result.error, undefined);
      assert(result.error.details.length > 0);
    });

    it('should strip unknown fields', () => {
      const schema = validateSearchRequest;
      const dataWithUnknown = {
        query: 'test',
        unknownField: 'should be removed'
      };

      const result = validateJoiSchema(schema, dataWithUnknown);

      assert.strictEqual(result.error, undefined);
      assert.strictEqual(result.value.unknownField, undefined);
      assert.strictEqual(result.value.query, 'test');
    });
  });
});
describe('Edge Cases and Additional Validations', () => {
  describe('Complex filter validations', () => {
    it('should validate complex range filters', () => {
      const request = {
        query: 'test',
        filters: {
          price: { gte: 100, lte: 500 },
          rating: { gt: 3.5, lt: 5.0 },
          created_at: { gte: new Date('2023-01-01') }
        }
      };

      const { error, value } = validateJoiSchema(validateSearchRequest, request);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.filters.price.gte, 100);
      assert.strictEqual(value.filters.rating.gt, 3.5);
    });

    it('should validate array filters', () => {
      const request = {
        query: 'test',
        filters: {
          categories: ['tech', 'science', 'ai'],
          status_codes: [200, 201, 202]
        }
      };

      const { error, value } = validateJoiSchema(validateSearchRequest, request);

      assert.strictEqual(error, undefined);
      assert.deepStrictEqual(value.filters.categories, ['tech', 'science', 'ai']);
      assert.deepStrictEqual(value.filters.status_codes, [200, 201, 202]);
    });
  });

  describe('Highlight configuration validation', () => {
    it('should validate highlight configuration', () => {
      const request = {
        query: 'test',
        highlight: {
          enabled: true,
          fields: ['title', 'content'],
          fragment_size: 200,
          number_of_fragments: 5
        }
      };

      const { error, value } = validateJoiSchema(validateSearchRequest, request);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.highlight.enabled, true);
      assert.deepStrictEqual(value.highlight.fields, ['title', 'content']);
      assert.strictEqual(value.highlight.fragment_size, 200);
      assert.strictEqual(value.highlight.number_of_fragments, 5);
    });

    it('should reject invalid highlight fragment size', () => {
      const request = {
        query: 'test',
        highlight: {
          enabled: true,
          fragment_size: 10 // too small
        }
      };

      const { error } = validateJoiSchema(validateSearchRequest, request);

      assert.notStrictEqual(error, undefined);
      assert(error.details.some((detail) => detail.path.includes('fragment_size')));
    });
  });

  describe('Boost and scoring validations', () => {
    it('should validate field boost configuration', () => {
      const request = {
        query: 'test',
        boost: {
          title: 2.0,
          content: 1.0,
          tags: 1.5
        }
      };

      const { error, value } = validateJoiSchema(validateSearchRequest, request);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.boost.title, 2.0);
      assert.strictEqual(value.boost.content, 1.0);
      assert.strictEqual(value.boost.tags, 1.5);
    });

    it('should reject negative boost values', () => {
      const request = {
        query: 'test',
        boost: {
          title: -1.0 // negative boost
        }
      };

      const { error } = validateJoiSchema(validateSearchRequest, request);

      assert.notStrictEqual(error, undefined);
      assert(error.details.some((detail) => detail.path.includes('boost')));
    });
  });

  describe('Vector dimension validations', () => {
    it('should validate large vectors within limits', () => {
      const largeVector = new Array(1024).fill(0).map(() => Math.random());
      const request = {
        vector: largeVector,
        k: 10
      };

      const { error, value } = validateJoiSchema(validateKNNSearchRequest, request);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.vector.length, 1024);
    });

    it('should reject vectors that are too large', () => {
      const tooLargeVector = new Array(3000).fill(0.1); // exceeds max of 2048
      const request = {
        vector: tooLargeVector,
        k: 10
      };

      const { error } = validateJoiSchema(validateKNNSearchRequest, request);

      assert.notStrictEqual(error, undefined);
      assert(error.details.some((detail) => detail.path.includes('vector')));
    });
  });

  describe('Timeout and performance validations', () => {
    it('should validate timeout patterns', () => {
      const request = {
        aggregations: {
          test: { type: 'terms', field: 'category' }
        },
        timeout: '45s'
      };

      const { error, value } = validateJoiSchema(validateAggregationRequest, request);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.timeout, '45s');
    });

    it('should validate different timeout units', () => {
      const requests = [{ timeout: '30s' }, { timeout: '5m' }, { timeout: '1h' }];

      requests.forEach((req) => {
        const fullRequest = {
          aggregations: { test: { type: 'terms', field: 'category' } },
          ...req
        };
        const { error } = validateJoiSchema(validateAggregationRequest, fullRequest);
        assert.strictEqual(error, undefined, `Failed for timeout: ${req.timeout}`);
      });
    });

    it('should reject invalid timeout format', () => {
      const request = {
        aggregations: {
          test: { type: 'terms', field: 'category' }
        },
        timeout: '30seconds' // invalid format
      };

      const { error } = validateJoiSchema(validateAggregationRequest, request);

      assert.notStrictEqual(error, undefined);
      assert(error.details.some((detail) => detail.path.includes('timeout')));
    });
  });

  describe('Pipeline processor edge cases', () => {
    it('should validate date processor with multiple formats', () => {
      const request = {
        id: 'date_pipeline',
        processors: [
          {
            date: {
              field: 'timestamp',
              target_field: 'parsed_date',
              formats: ['yyyy-MM-dd', 'yyyy-MM-dd HH:mm:ss', 'epoch_millis'],
              timezone: 'UTC'
            }
          }
        ]
      };

      const { error, value } = validateJoiSchema(validateCreatePipelineRequest, request);

      assert.strictEqual(error, undefined);
      assert.deepStrictEqual(value.processors[0].date.formats, [
        'yyyy-MM-dd',
        'yyyy-MM-dd HH:mm:ss',
        'epoch_millis'
      ]);
      assert.strictEqual(value.processors[0].date.timezone, 'UTC');
    });

    it('should validate script processor with parameters', () => {
      const request = {
        id: 'script_pipeline',
        processors: [
          {
            script: {
              source: 'ctx.computed_field = params.multiplier * ctx.base_value',
              params: {
                multiplier: 2.5
              },
              lang: 'painless'
            }
          }
        ]
      };

      const { error, value } = validateJoiSchema(validateCreatePipelineRequest, request);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.processors[0].script.params.multiplier, 2.5);
      assert.strictEqual(value.processors[0].script.lang, 'painless');
    });

    it('should validate convert processor with all types', () => {
      const types = ['integer', 'long', 'float', 'double', 'string', 'boolean', 'auto'];

      types.forEach((type) => {
        const request = {
          id: `convert_${type}_pipeline`,
          processors: [
            {
              convert: {
                field: 'test_field',
                type,
                target_field: `converted_${type}`
              }
            }
          ]
        };

        const { error } = validateJoiSchema(validateCreatePipelineRequest, request);
        assert.strictEqual(error, undefined, `Failed for convert type: ${type}`);
      });
    });
  });

  describe('Bulk operations edge cases', () => {
    it('should validate bulk request at maximum size limit', () => {
      const maxDocuments = new Array(10000).fill(0).map((_, i) => ({
        _id: `doc_${i}`,
        _source: { title: `Document ${i}`, content: `Content for document ${i}` }
      }));

      const request = {
        documents: maxDocuments,
        index: 'test_index'
      };

      const { error, value } = validateJoiSchema(validateBulkIndexRequest, request);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.documents.length, 10000);
    });

    it('should reject bulk request exceeding maximum size', () => {
      const tooManyDocuments = new Array(10001).fill(0).map((_, i) => ({
        _source: { title: `Document ${i}` }
      }));

      const request = {
        documents: tooManyDocuments,
        index: 'test_index'
      };

      const { error } = validateJoiSchema(validateBulkIndexRequest, request);

      assert.notStrictEqual(error, undefined);
      assert(error.details.some((detail) => detail.path.includes('documents')));
    });
  });

  describe('Index management validations', () => {
    it('should validate complex index mappings', () => {
      const request = {
        index: 'complex_index',
        mappings: {
          properties: {
            title: {
              type: 'text',
              analyzer: 'standard',
              fields: {
                keyword: { type: 'keyword' },
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
                tags: { type: 'keyword' },
                created_at: { type: 'date' }
              }
            }
          }
        },
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
          analysis: {
            analyzer: {
              ngram_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'ngram_filter']
              }
            }
          }
        }
      };

      const { error, value } = validateJoiSchema(validateCreateIndexRequest, request);

      assert.strictEqual(error, undefined);
      assert.strictEqual(value.mappings.properties.title.type, 'text');
      assert.strictEqual(value.mappings.properties.embedding.dims, 768);
      assert.strictEqual(value.settings.number_of_shards, 1);
    });

    it('should validate index deletion with multiple indices', () => {
      const request = {
        index: ['index1', 'index2', 'index3'],
        timeout: '30s'
      };

      const { error, value } = validateJoiSchema(validateDeleteIndexRequest, request);

      assert.strictEqual(error, undefined);
      assert.deepStrictEqual(value.index, ['index1', 'index2', 'index3']);
      assert.strictEqual(value.timeout, '30s');
    });
  });
});
// });
