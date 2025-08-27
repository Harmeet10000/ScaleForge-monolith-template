// Create index with N-gram analyzers
import { Client } from '@elastic/elasticsearch';

const client = new Client({
  node: 'http://localhost:9200'
});

const indexMapping = {
  settings: {
    analysis: {
      analyzer: {
        ngram_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'ngram_filter']
        },
        edge_ngram_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'edge_ngram_filter']
        },
        fuzzy_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'asciifolding']
        }
      },
      filter: {
        ngram_filter: {
          type: 'ngram',
          min_gram: 2,
          max_gram: 4
        },
        edge_ngram_filter: {
          type: 'edge_ngram',
          min_gram: 2,
          max_gram: 10
        }
      }
    }
  },
  mappings: {
    properties: {
      title: {
        type: 'text',
        analyzer: 'standard',
        fields: {
          ngram: {
            type: 'text',
            analyzer: 'ngram_analyzer'
          },
          edge_ngram: {
            type: 'text',
            analyzer: 'edge_ngram_analyzer'
          },
          fuzzy: {
            type: 'text',
            analyzer: 'fuzzy_analyzer'
          }
        }
      },
      authors: {
        type: 'text',
        analyzer: 'standard',
        fields: {
          ngram: {
            type: 'text',
            analyzer: 'ngram_analyzer'
          },
          edge_ngram: {
            type: 'text',
            analyzer: 'edge_ngram_analyzer'
          },
          fuzzy: {
            type: 'text',
            analyzer: 'fuzzy_analyzer'
          }
        }
      },
      explanation: {
        type: 'text',
        analyzer: 'standard'
      },
      date: {
        type: 'date'
      },
      image_url: {
        type: 'keyword'
      }
    }
  }
};

// Create the index
async function createIndex() {
  try {
    await client.indices.delete({ index: 'apod_n_gram', ignore_unavailable: true });
    await client.indices.create({ index: 'apod_n_gram', body: indexMapping });
    console.log('Index created successfully');
  } catch (error) {
    console.error('Error creating index:', error);
  }
}

createIndex();
