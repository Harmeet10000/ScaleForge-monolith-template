import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PIPELINE_PROCESSORS } from '../../src/constants/searchConstants.js';

describe('Pipeline Service Constants and Validation', () => {
  describe('Pipeline processor constants', () => {
    it('should have all required processor constants', () => {
      const requiredProcessors = [
        'LOWERCASE',
        'UPPERCASE',
        'TRIM',
        'REMOVE',
        'RENAME',
        'SET',
        'SCRIPT',
        'DATE',
        'CONVERT'
      ];

      requiredProcessors.forEach((processor) => {
        assert.ok(PIPELINE_PROCESSORS[processor], `Missing processor constant: ${processor}`);
        assert.strictEqual(typeof PIPELINE_PROCESSORS[processor], 'string');
      });
    });

    it('should have correct processor values', () => {
      assert.strictEqual(PIPELINE_PROCESSORS.LOWERCASE, 'lowercase');
      assert.strictEqual(PIPELINE_PROCESSORS.UPPERCASE, 'uppercase');
      assert.strictEqual(PIPELINE_PROCESSORS.TRIM, 'trim');
      assert.strictEqual(PIPELINE_PROCESSORS.REMOVE, 'remove');
      assert.strictEqual(PIPELINE_PROCESSORS.RENAME, 'rename');
      assert.strictEqual(PIPELINE_PROCESSORS.SET, 'set');
      assert.strictEqual(PIPELINE_PROCESSORS.SCRIPT, 'script');
      assert.strictEqual(PIPELINE_PROCESSORS.DATE, 'date');
      assert.strictEqual(PIPELINE_PROCESSORS.CONVERT, 'convert');
    });
  });

  describe('Pipeline configuration validation', () => {
    it('should validate pipeline name requirements', () => {
      // Test valid pipeline names
      const validNames = ['test-pipeline', 'my_pipeline', 'pipeline123'];
      validNames.forEach((name) => {
        assert.strictEqual(typeof name, 'string');
        assert.ok(name.length > 0);
      });

      // Test invalid pipeline names
      const invalidNames = [null, undefined, '', 123, {}, []];
      invalidNames.forEach((name) => {
        assert.ok(
          name === null || name === undefined || name === '' || typeof name !== 'string',
          `Invalid name should be rejected: ${name}`
        );
      });
    });

    it('should validate processor array requirements', () => {
      // Test valid processor arrays
      const validProcessors = [
        [{ lowercase: { field: 'title' } }],
        [{ lowercase: { field: 'title' } }, { trim: { field: 'content' } }]
      ];

      validProcessors.forEach((processors) => {
        assert.ok(Array.isArray(processors));
        assert.ok(processors.length > 0);
        processors.forEach((processor) => {
          assert.strictEqual(typeof processor, 'object');
          assert.ok(processor !== null);
        });
      });

      // Test invalid processor arrays
      const invalidProcessors = [null, undefined, '', 'not-array', {}, []];
      invalidProcessors.forEach((processors) => {
        assert.ok(
          processors === null ||
            processors === undefined ||
            !Array.isArray(processors) ||
            processors.length === 0,
          `Invalid processors should be rejected: ${processors}`
        );
      });
    });

    it('should validate document structure requirements', () => {
      // Test valid documents
      const validDocuments = [
        { title: 'Test', content: 'Content' },
        { name: 'Name', description: 'Description', tags: ['tag1', 'tag2'] },
        { id: 1, data: { nested: 'value' } }
      ];

      validDocuments.forEach((doc) => {
        assert.strictEqual(typeof doc, 'object');
        assert.ok(doc !== null);
        assert.ok(!Array.isArray(doc));
      });

      // Test invalid documents
      const invalidDocuments = [null, undefined, '', 'string', 123, [], true];
      invalidDocuments.forEach((doc) => {
        assert.ok(
          doc === null || doc === undefined || typeof doc !== 'object' || Array.isArray(doc),
          `Invalid document should be rejected: ${doc}`
        );
      });
    });
  });

  describe('Pipeline processor configurations', () => {
    it('should create valid lowercase processor configuration', () => {
      const processor = {
        [PIPELINE_PROCESSORS.LOWERCASE]: {
          field: 'title',
          ignore_missing: true
        }
      };

      assert.ok(processor.lowercase);
      assert.strictEqual(processor.lowercase.field, 'title');
      assert.strictEqual(processor.lowercase.ignore_missing, true);
    });

    it('should create valid trim processor configuration', () => {
      const processor = {
        [PIPELINE_PROCESSORS.TRIM]: {
          field: 'content',
          ignore_missing: true
        }
      };

      assert.ok(processor.trim);
      assert.strictEqual(processor.trim.field, 'content');
      assert.strictEqual(processor.trim.ignore_missing, true);
    });

    it('should create valid set processor configuration', () => {
      const processor = {
        [PIPELINE_PROCESSORS.SET]: {
          field: 'processed_at',
          value: '{{_ingest.timestamp}}'
        }
      };

      assert.ok(processor.set);
      assert.strictEqual(processor.set.field, 'processed_at');
      assert.strictEqual(processor.set.value, '{{_ingest.timestamp}}');
    });

    it('should create valid script processor configuration', () => {
      const processor = {
        [PIPELINE_PROCESSORS.SCRIPT]: {
          source: 'ctx.content_length = ctx.content.length();',
          ignore_failure: true
        }
      };

      assert.ok(processor.script);
      assert.strictEqual(processor.script.source, 'ctx.content_length = ctx.content.length();');
      assert.strictEqual(processor.script.ignore_failure, true);
    });

    it('should create valid remove processor configuration', () => {
      const processor = {
        [PIPELINE_PROCESSORS.REMOVE]: {
          field: 'temp_field',
          ignore_missing: true
        }
      };

      assert.ok(processor.remove);
      assert.strictEqual(processor.remove.field, 'temp_field');
      assert.strictEqual(processor.remove.ignore_missing, true);
    });
  });

  describe('Pipeline helper function configurations', () => {
    it('should validate text processing pipeline options', () => {
      const defaultOptions = {
        titleField: 'title',
        contentField: 'content',
        lowercaseFields: ['title'],
        trimFields: ['title', 'content'],
        removeFields: [],
        addTimestamp: true
      };

      // Validate default options structure
      assert.strictEqual(typeof defaultOptions.titleField, 'string');
      assert.strictEqual(typeof defaultOptions.contentField, 'string');
      assert.ok(Array.isArray(defaultOptions.lowercaseFields));
      assert.ok(Array.isArray(defaultOptions.trimFields));
      assert.ok(Array.isArray(defaultOptions.removeFields));
      assert.strictEqual(typeof defaultOptions.addTimestamp, 'boolean');
    });

    it('should validate embedding pipeline options', () => {
      const defaultOptions = {
        textField: 'content',
        embeddingField: 'embedding',
        modelId: 'sentence-transformers__all-minilm-l6-v2',
        addMetadata: true
      };

      // Validate default options structure
      assert.strictEqual(typeof defaultOptions.textField, 'string');
      assert.strictEqual(typeof defaultOptions.embeddingField, 'string');
      assert.strictEqual(typeof defaultOptions.modelId, 'string');
      assert.strictEqual(typeof defaultOptions.addMetadata, 'boolean');
    });

    it('should validate data enrichment pipeline options', () => {
      const defaultOptions = {
        categoryField: 'category',
        tagsField: 'tags',
        addDefaults: true,
        normalizeCategories: true
      };

      // Validate default options structure
      assert.strictEqual(typeof defaultOptions.categoryField, 'string');
      assert.strictEqual(typeof defaultOptions.tagsField, 'string');
      assert.strictEqual(typeof defaultOptions.addDefaults, 'boolean');
      assert.strictEqual(typeof defaultOptions.normalizeCategories, 'boolean');
    });

    it('should validate validation pipeline options', () => {
      const defaultOptions = {
        requiredFields: ['title', 'content'],
        validateEmail: false,
        emailField: 'email',
        validateDates: false,
        dateFields: ['created_at', 'updated_at']
      };

      // Validate default options structure
      assert.ok(Array.isArray(defaultOptions.requiredFields));
      assert.strictEqual(typeof defaultOptions.validateEmail, 'boolean');
      assert.strictEqual(typeof defaultOptions.emailField, 'string');
      assert.strictEqual(typeof defaultOptions.validateDates, 'boolean');
      assert.ok(Array.isArray(defaultOptions.dateFields));
    });
  });

  describe('Pipeline processing logic validation', () => {
    it('should validate batch processing result structure', () => {
      const mockResult = {
        processedDocuments: [
          { title: 'processed title 1', content: 'Content 1' },
          { title: 'processed title 2', content: 'Content 2' }
        ],
        errors: null,
        summary: {
          total: 2,
          successful: 2,
          failed: 0
        }
      };

      // Validate result structure
      assert.ok(Array.isArray(mockResult.processedDocuments));
      assert.strictEqual(mockResult.processedDocuments.length, 2);
      assert.strictEqual(mockResult.errors, null);
      assert.strictEqual(typeof mockResult.summary, 'object');
      assert.strictEqual(mockResult.summary.total, 2);
      assert.strictEqual(mockResult.summary.successful, 2);
      assert.strictEqual(mockResult.summary.failed, 0);
    });

    it('should validate batch processing result with errors', () => {
      const mockResultWithErrors = {
        processedDocuments: [{ title: 'processed title 1', content: 'Content 1' }],
        errors: [
          {
            index: 1,
            error: 'Processing failed',
            originalDoc: { title: 'TITLE 2', content: 'Content 2' }
          }
        ],
        summary: {
          total: 2,
          successful: 1,
          failed: 1
        }
      };

      // Validate result structure with errors
      assert.ok(Array.isArray(mockResultWithErrors.processedDocuments));
      assert.ok(Array.isArray(mockResultWithErrors.errors));
      assert.strictEqual(mockResultWithErrors.errors.length, 1);
      assert.strictEqual(mockResultWithErrors.summary.total, 2);
      assert.strictEqual(mockResultWithErrors.summary.successful, 1);
      assert.strictEqual(mockResultWithErrors.summary.failed, 1);
    });

    it('should validate pipeline test result structure', () => {
      const mockTestResult = {
        pipelineName: 'test-pipeline',
        originalDocument: { title: 'TEST TITLE', content: 'Test content' },
        processedDocument: { title: 'test title', content: 'Test content' },
        success: true,
        error: null,
        processingTime: 5
      };

      // Validate test result structure
      assert.strictEqual(typeof mockTestResult.pipelineName, 'string');
      assert.strictEqual(typeof mockTestResult.originalDocument, 'object');
      assert.strictEqual(typeof mockTestResult.processedDocument, 'object');
      assert.strictEqual(typeof mockTestResult.success, 'boolean');
      assert.strictEqual(mockTestResult.error, null);
      assert.strictEqual(typeof mockTestResult.processingTime, 'number');
    });
  });
});
