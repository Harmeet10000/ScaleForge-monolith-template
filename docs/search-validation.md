# Search Validation Schemas

This document describes the validation schemas for the Elasticsearch search system.

## Overview

The search validation schemas are implemented using Joi and provide comprehensive validation for all search-related operations including:

- Multi-field search requests
- Semantic search with vector embeddings
- KNN similarity search
- Aggregation queries
- Document indexing and bulk operations
- Index and pipeline management

## Usage

```javascript
import { validateJoiSchema, validateSearchRequest } from '../validations/searchValidation.js';

// Validate a search request
const searchData = {
  query: 'artificial intelligence',
  fields: ['title', 'content'],
  pagination: { page: 1, limit: 20 }
};

const { error, value } = validateJoiSchema(validateSearchRequest, searchData);

if (error) {
  // Handle validation errors
  console.error('Validation failed:', error.details);
} else {
  // Use validated data
  console.log('Validated data:', value);
}
```

## Available Validation Schemas

### Search Operations

- `validateSearchRequest` - Multi-field text search
- `validateSemanticSearchRequest` - Vector-based semantic search
- `validateKNNSearchRequest` - K-nearest neighbors search
- `validateAggregationRequest` - Aggregation queries

### Document Operations

- `validateIndexDocumentRequest` - Single document indexing
- `validateBulkIndexRequest` - Bulk document operations
- `validateUpdateDocumentRequest` - Document updates
- `validateDeleteDocumentRequest` - Document deletion

### Index Management

- `validateCreateIndexRequest` - Index creation
- `validateUpdateIndexMappingRequest` - Index mapping updates
- `validateDeleteIndexRequest` - Index deletion

### Pipeline Management

- `validateCreatePipelineRequest` - Ingest pipeline creation
- `validateUpdatePipelineRequest` - Pipeline updates
- `validateDeletePipelineRequest` - Pipeline deletion

## Key Features

### Default Values

All schemas provide sensible defaults:

- Default page size: 20 (max 100)
- Default index: 'documents' or 'vectors'
- Default similarity metric: 'cosine'
- Default refresh: 'false'

### Comprehensive Validation

- Field type validation
- Range constraints (e.g., pagination limits)
- Pattern matching (e.g., timeout formats)
- Complex object validation
- Array validation with size limits

### Error Handling

- Detailed error messages with field paths
- Multiple error reporting (abortEarly: false)
- Unknown field stripping for security

### Performance Considerations

- Maximum vector dimensions: 2048
- Maximum bulk size: 10,000 documents
- Maximum page offset: 10,000
- Timeout pattern validation

## Examples

### Multi-field Search

```javascript
const searchRequest = {
  query: 'machine learning algorithms',
  fields: ['title', 'content', 'tags'],
  filters: {
    category: 'technology',
    created_at: { gte: '2023-01-01' }
  },
  sort: { created_at: 'desc' },
  pagination: { page: 1, limit: 50 },
  highlight: {
    enabled: true,
    fragment_size: 200
  },
  fuzzy: true
};
```

### Semantic Search

```javascript
const semanticRequest = {
  query: 'natural language processing techniques',
  threshold: 0.7,
  hybridMode: true,
  hybridWeight: {
    semantic: 0.8,
    keyword: 0.2
  }
};
```

### KNN Search

```javascript
const knnRequest = {
  vector: [0.1, 0.2, 0.3 /* ... 768 dimensions */],
  k: 10,
  similarity_metric: 'cosine',
  filters: { category: 'research' },
  rescore: {
    window_size: 100,
    query_weight: 1.0,
    rescore_query_weight: 1.2
  }
};
```

### Aggregations

```javascript
const aggregationRequest = {
  aggregations: {
    categories: {
      type: 'terms',
      field: 'category',
      size: 20
    },
    timeline: {
      type: 'date_histogram',
      field: 'created_at',
      interval: 'month'
    },
    price_ranges: {
      type: 'range',
      field: 'price',
      ranges: [
        { to: 100, key: 'budget' },
        { from: 100, to: 500, key: 'mid-range' },
        { from: 500, key: 'premium' }
      ]
    }
  }
};
```

### Document Indexing

```javascript
const indexRequest = {
  document: {
    title: 'Advanced Machine Learning Techniques',
    content: 'This document covers advanced ML algorithms...',
    category: 'technology',
    tags: ['ml', 'ai', 'algorithms'],
    metadata: {
      author: 'John Doe',
      created_at: new Date().toISOString()
    }
  },
  index: 'documents',
  pipeline: 'text_processing',
  refresh: 'wait_for'
};
```

### Pipeline Creation

```javascript
const pipelineRequest = {
  id: 'comprehensive_text_processing',
  description: 'Process and enrich text documents',
  processors: [
    {
      lowercase: {
        field: 'title',
        ignore_missing: true
      }
    },
    {
      trim: {
        field: 'content'
      }
    },
    {
      set: {
        field: 'processed_at',
        value: '{{_ingest.timestamp}}'
      }
    },
    {
      script: {
        source: 'ctx.word_count = ctx.content.split(" ").length',
        lang: 'painless'
      }
    }
  ],
  on_failure: [
    {
      set: {
        field: 'error',
        value: 'Pipeline processing failed'
      }
    }
  ]
};
```

## Testing

The validation schemas are thoroughly tested with 57+ test cases covering:

- Valid input scenarios
- Invalid input rejection
- Edge cases and boundary conditions
- Default value application
- Complex nested object validation

Run tests with:

```bash
npm test
```

## Integration

The validation schemas integrate seamlessly with the existing Express.js application:

- Consistent with existing validation patterns
- Uses the same `validateJoiSchema` helper function
- Follows DRY principles with reusable components
- Integrates with existing error handling middleware
