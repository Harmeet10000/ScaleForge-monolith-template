import { Client } from '@elastic/elasticsearch';

export const client = new Client({
  node: process.env.ELASTICSEARCH_HOST,
  auth: {
    apiKey: process.env.ELASTICSEARCH_API_KEY
  }
});

// const createResponse = client.indices.create({
//   index: 'search-38jf',
//   mappings: {
//     properties: {
//       text: { type: 'semantic_text' }
//     }
//   }
// });
// console.log(createResponse);
