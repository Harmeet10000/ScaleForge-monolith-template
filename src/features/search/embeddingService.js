import { GoogleGenAI } from '@google/genai';
import { logger } from '../../utils/logger.js';
import asyncHandler from 'express-async-handler';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

export const generateEmbedding = asyncHandler(async (text) => {
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: [text],
    taskType: 'SEMANTIC_SIMILARITY'
  });

  const embedding = response.embeddings[0].values.slice(0, 768);

  logger.info('Embedding generated successfully', {
    meta: { textLength: text.length, dimensions: embedding.length }
  });

  return embedding;
});

export const generateBatchEmbeddings = asyncHandler(async (texts) => {
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: texts,
    taskType: 'SEMANTIC_SIMILARITY'
  });

  const embeddings = response.embeddings.map((e) => e.values.slice(0, 768));

  logger.info('Batch embeddings generated successfully', {
    meta: { totalTexts: texts.length, dimensions: embeddings[0]?.length }
  });

  return embeddings;
});
