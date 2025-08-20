import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildMultiFieldQuery,
  buildSemanticQuery,
  buildKNNQuery,
  buildAggregationQuery
} from '../../src/repository/searchQueryBuilders.js';

describe('Search Repository Query Builders', () => {
  describe('buildMultiFieldQuery', () => {
    it('should build basic multi-field query', () => {
      const searchParams = {
        query: 'test search',
        fields: ['title', 'content'],
        pagination: { page: 1, limit: 20 }
      };

      const result = buildMultiFieldQuery(searchParams);

      assert.strictEqual(result.query.bool.must.length, 1);
      assert.strictEqual(result.query.bool.must[0].multi_match.query, 'test search');
      assert.deepStrictEqual(result.query.bool.must[0].multi_match.fields, ['title', 'content']);
      assert.strictEqual(result.from, 0);
      assert.strictEqual(result.size, 20);
    });

    it('should handle fuzzy search', () => {
      const searchParams = {
        query: 'test',
        fields: ['title'],
        fuzzy: true
      };

      const result = buildMultiFieldQuery(searchParams);

      assert.strictEqual(result.query.bool.must[0].multi_match.fuzziness, 'AUTO');
    });

    it('should handle filters with different types', () => {
      const searchParams = {
        query: 'test',
        fields: ['title'],
        filters: {
          category: 'tech',
          tags: ['ai', 'ml'],
          price: { gte: 100, lte: 500 },
          status: 'active'
        }
      };

      const result = buildMultiFieldQuery(searchParams);

      assert.strictEqual(result.query.bool.filter.length, 4);

      // Check term filter
      const termFilter = result.query.bool.filter.find((f) => f.term && f.term.category);
      assert.strictEqual(termFilter.term.category, 'tech');

      // Check terms filter (array)
      const termsFilter = result.query.bool.filter.find((f) => f.terms && f.terms.tags);
      assert.deepStrictEqual(termsFilter.terms.tags, ['ai', 'ml']);

      // Check range filter
      const rangeFilter = result.query.bool.filter.find((f) => f.range && f.range.price);
      assert.strictEqual(rangeFilter.range.price.gte, 100);
      assert.strictEqual(rangeFilter.range.price.lte, 500);
    });

    it('should handle sorting', () => {
      const searchParams = {
        query: 'test',
        fields: ['title'],
        sort: {
          created_at: 'desc',
          score: 'asc'
        }
      };

      const result = buildMultiFieldQuery(searchParams);

      assert.strictEqual(result.sort.length, 2);
      assert.deepStrictEqual(result.sort[0], { created_at: { order: 'desc' } });
      assert.deepStrictEqual(result.sort[1], { score: { order: 'asc' } });
    });

    it('should handle highlighting', () => {
      const searchParams = {
        query: 'test',
        fields: ['title', 'content'],
        highlight: true
      };

      const result = buildMultiFieldQuery(searchParams);

      assert(result.highlight);
      assert(result.highlight.fields.title);
      assert(result.highlight.fields.content);
    });

    it('should handle pagination correctly', () => {
      const searchParams = {
        query: 'test',
        fields: ['title'],
        pagination: { page: 3, limit: 50 }
      };

      const result = buildMultiFieldQuery(searchParams);

      assert.strictEqual(result.from, 100); // (3-1) * 50
      assert.strictEqual(result.size, 50);
    });

    it('should use query_string when no fields specified', () => {
      const searchParams = {
        query: 'test search'
      };

      const result = buildMultiFieldQuery(searchParams);

      assert.strictEqual(result.query.bool.must[0].query_string.query, 'test search');
      assert.strictEqual(result.query.bool.must[0].query_string.default_operator, 'AND');
    });

    it('should use match_all when no query provided', () => {
      const searchParams = {
        fields: ['title']
      };

      const result = buildMultiFieldQuery(searchParams);

      assert(result.query.bool.must[0].match_all);
    });
  });

  describe('buildSemanticQuery', () => {
    it('should build basic semantic query', () => {
      const vector = [0.1, 0.2, 0.3, 0.4, 0.5];
      const options = {
        threshold: 0.7,
        pagination: { page: 1, limit: 10 }
      };

      const result = buildSemanticQuery(vector, options);

      assert.strictEqual(result.query.bool.must.length, 1);
      assert(result.query.bool.must[0].script_score);
      assert.strictEqual(result.query.bool.must[0].script_score.min_score, 0.7);
      assert.deepStrictEqual(
        result.query.bool.must[0].script_score.script.params.query_vector,
        vector
      );
    });

    it('should handle hybrid mode', () => {
      const vector = [0.1, 0.2, 0.3];
      const options = {
        hybridMode: true,
        textQuery: 'machine learning',
        fields: ['title', 'content']
      };

      const result = buildSemanticQuery(vector, options);

      assert(result.query.bool.should);
      assert.strictEqual(result.query.bool.should.length, 2);
      assert(result.query.bool.should[0].script_score);
      assert(result.query.bool.should[1].multi_match);
      assert.strictEqual(result.query.bool.minimum_should_match, 1);
    });

    it('should handle filters', () => {
      const vector = [0.1, 0.2, 0.3];
      const options = {
        filters: {
          category: 'tech',
          status: ['active', 'published']
        }
      };

      const result = buildSemanticQuery(vector, options);

      assert.strictEqual(result.query.bool.filter.length, 2);
    });

    it('should use default threshold when not provided', () => {
      const vector = [0.1, 0.2, 0.3];
      const options = {};

      const result = buildSemanticQuery(vector, options);

      assert.strictEqual(result.query.bool.must[0].script_score.min_score, 0.5);
    });
  });

  describe('buildKNNQuery', () => {
    it('should build basic KNN query', () => {
      const vector = [0.1, 0.2, 0.3, 0.4, 0.5];
      const k = 10;
      const options = {};

      const result = buildKNNQuery(vector, k, options);

      assert.strictEqual(result.knn.field, 'embedding');
      assert.deepStrictEqual(result.knn.query_vector, vector);
      assert.strictEqual(result.knn.k, 10);
      assert.strictEqual(result.knn.similarity, 'cosine');
      assert.strictEqual(result.size, 10);
      assert.strictEqual(result.knn.num_candidates, 100); // k * 10
    });

    it('should handle custom field and similarity metric', () => {
      const vector = [0.1, 0.2, 0.3];
      const k = 5;
      const options = {
        field: 'custom_embedding',
        similarityMetric: 'l2_norm'
      };

      const result = buildKNNQuery(vector, k, options);

      assert.strictEqual(result.knn.field, 'custom_embedding');
      assert.strictEqual(result.knn.similarity, 'l2_norm');
    });

    it('should handle pre-filtering', () => {
      const vector = [0.1, 0.2, 0.3];
      const k = 5;
      const options = {
        preFilter: true,
        filters: {
          category: 'tech',
          tags: ['ai', 'ml']
        }
      };

      const result = buildKNNQuery(vector, k, options);

      assert(result.knn.filter);
      assert(result.knn.filter.bool);
      assert.strictEqual(result.knn.filter.bool.filter.length, 2);
    });

    it('should handle post-filtering', () => {
      const vector = [0.1, 0.2, 0.3];
      const k = 5;
      const options = {
        postFilter: true,
        filters: {
          status: 'active'
        }
      };

      const result = buildKNNQuery(vector, k, options);

      assert(result.post_filter);
      assert(result.post_filter.bool);
      assert.strictEqual(result.post_filter.bool.filter.length, 1);
    });

    it('should ensure minimum num_candidates', () => {
      const vector = [0.1, 0.2, 0.3];
      const k = 5;
      const options = {};

      const result = buildKNNQuery(vector, k, options);

      assert.strictEqual(result.knn.num_candidates, 100); // Math.max(5 * 10, 100)
    });
  });

  describe('buildAggregationQuery', () => {
    it('should build terms aggregation', () => {
      const aggregations = {
        categories: {
          type: 'terms',
          field: 'category',
          size: 15,
          order: { _key: 'asc' }
        }
      };

      const result = buildAggregationQuery(aggregations);

      assert(result.categories.terms);
      assert.strictEqual(result.categories.terms.field, 'category');
      assert.strictEqual(result.categories.terms.size, 15);
      assert.deepStrictEqual(result.categories.terms.order, { _key: 'asc' });
    });

    it('should build date histogram aggregation', () => {
      const aggregations = {
        timeline: {
          type: 'date_histogram',
          field: 'created_at',
          interval: 'month',
          format: 'yyyy-MM',
          min_doc_count: 1
        }
      };

      const result = buildAggregationQuery(aggregations);

      assert(result.timeline.date_histogram);
      assert.strictEqual(result.timeline.date_histogram.field, 'created_at');
      assert.strictEqual(result.timeline.date_histogram.calendar_interval, 'month');
      assert.strictEqual(result.timeline.date_histogram.format, 'yyyy-MM');
      assert.strictEqual(result.timeline.date_histogram.min_doc_count, 1);
    });

    it('should build range aggregation', () => {
      const aggregations = {
        price_ranges: {
          type: 'range',
          field: 'price',
          ranges: [{ to: 100 }, { from: 100, to: 500 }, { from: 500 }]
        }
      };

      const result = buildAggregationQuery(aggregations);

      assert(result.price_ranges.range);
      assert.strictEqual(result.price_ranges.range.field, 'price');
      assert.strictEqual(result.price_ranges.range.ranges.length, 3);
    });

    it('should build stats aggregation', () => {
      const aggregations = {
        score_stats: {
          type: 'stats',
          field: 'score'
        }
      };

      const result = buildAggregationQuery(aggregations);

      assert(result.score_stats.stats);
      assert.strictEqual(result.score_stats.stats.field, 'score');
    });

    it('should build histogram aggregation', () => {
      const aggregations = {
        score_histogram: {
          type: 'histogram',
          field: 'score',
          interval: 0.5,
          min_doc_count: 2
        }
      };

      const result = buildAggregationQuery(aggregations);

      assert(result.score_histogram.histogram);
      assert.strictEqual(result.score_histogram.histogram.field, 'score');
      assert.strictEqual(result.score_histogram.histogram.interval, 0.5);
      assert.strictEqual(result.score_histogram.histogram.min_doc_count, 2);
    });

    it('should build metric aggregations', () => {
      const aggregations = {
        avg_score: { type: 'avg', field: 'score' },
        sum_price: { type: 'sum', field: 'price' },
        min_date: { type: 'min', field: 'created_at' },
        max_date: { type: 'max', field: 'created_at' },
        unique_users: {
          type: 'cardinality',
          field: 'user_id',
          precision_threshold: 5000
        }
      };

      const result = buildAggregationQuery(aggregations);

      assert(result.avg_score.avg);
      assert(result.sum_price.sum);
      assert(result.min_date.min);
      assert(result.max_date.max);
      assert(result.unique_users.cardinality);
      assert.strictEqual(result.unique_users.cardinality.precision_threshold, 5000);
    });

    it('should handle nested aggregations', () => {
      const aggregations = {
        categories: {
          type: 'terms',
          field: 'category',
          aggs: {
            avg_score: {
              type: 'avg',
              field: 'score'
            }
          }
        }
      };

      const result = buildAggregationQuery(aggregations);

      assert(result.categories.terms);
      assert(result.categories.aggs);
      assert(result.categories.aggs.avg_score.avg);
    });

    it('should use default values for terms aggregation', () => {
      const aggregations = {
        simple_terms: {
          type: 'terms',
          field: 'category'
        }
      };

      const result = buildAggregationQuery(aggregations);

      assert.strictEqual(result.simple_terms.terms.size, 10);
      assert.deepStrictEqual(result.simple_terms.terms.order, { _count: 'desc' });
    });

    it('should use default values for date histogram', () => {
      const aggregations = {
        simple_date: {
          type: 'date_histogram',
          field: 'created_at'
        }
      };

      const result = buildAggregationQuery(aggregations);

      assert.strictEqual(result.simple_date.date_histogram.calendar_interval, 'day');
      assert.strictEqual(result.simple_date.date_histogram.format, 'yyyy-MM-dd');
      assert.strictEqual(result.simple_date.date_histogram.min_doc_count, 0);
    });

    it('should use default values for histogram', () => {
      const aggregations = {
        simple_histogram: {
          type: 'histogram',
          field: 'score'
        }
      };

      const result = buildAggregationQuery(aggregations);

      assert.strictEqual(result.simple_histogram.histogram.interval, 1);
      assert.strictEqual(result.simple_histogram.histogram.min_doc_count, 0);
    });

    it('should use default precision_threshold for cardinality', () => {
      const aggregations = {
        unique_count: {
          type: 'cardinality',
          field: 'user_id'
        }
      };

      const result = buildAggregationQuery(aggregations);

      assert.strictEqual(result.unique_count.cardinality.precision_threshold, 3000);
    });
  });
});
