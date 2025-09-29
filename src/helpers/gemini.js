import { GoogleGenAI } from '@google/genai';
import { logger } from '../utils/logger.js';

export const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateText(prompt, opts = {}) {
  const response = await ai.models.generateContent({
    model: opts.model ?? 'gemini-2.5-flash',
    contents: prompt,
    config: opts.config ?? {}
  });
  logger.info('gemini.generateText', { meta: { model: opts.model ?? 'gemini-2.5-flash' } });
  return response.text;
}

export async function generateTextStream(prompt, opts = {}) {
  const stream = await ai.models.generateContentStream({
    model: opts.model ?? 'gemini-2.5-flash',
    contents: prompt,
    config: opts.config ?? {}
  });
  logger.info('gemini.generateTextStream started', {
    meta: { model: opts.model ?? 'gemini-2.5-flash' }
  });
  return stream; // caller should `for await (const chunk of stream)`
}

export async function embedText(text, opts) {
  const response = await ai.models.embedContent({
    model: opts.model ?? 'gemini-embedding-001',
    contents: [text],
    taskType: 'SEMANTIC_SIMILARITY'
  });
  const embeddings = response.embeddings.map((e) => e.values);
  logger.info('Embedding generated successfully', {
    meta: { textLength: text.length, dimensions: embeddings.length }
  });
  return embeddings;
}

export async function generateImage(prompt, opts = {}) {
  const response = await ai.models.generateImages({
    model: opts.model ?? 'imagen-4.0-generate-001',
    prompt,
    config: opts.config ?? { numberOfImages: 1 }
  });
  const img = response.generatedImages?.[0]?.image?.imageBytes;
  logger.info('gemini.generateImage', { meta: { prompt, gotImage: Boolean(img) } });
  return img; // base64 image bytes string or undefined
}

export async function generateVideo(prompt, opts = {}) {
  // Starts a long-running video generation operation and returns the operation object.
  const operation = await ai.models.generateVideos({
    model: opts.model ?? 'veo-2.0-generate-001',
    prompt,
    config: opts.config ?? { numberOfVideos: 1 }
  });
  logger.info('gemini.generateVideo started', { meta: { operationId: operation?.name } });
  return operation;
}

export async function generateJson(prompt, schema, opts = {}) {
  const response = await ai.models.generateContent({
    model: opts.model ?? 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
      ...(opts.config ?? {})
    }
  });
  logger.info('gemini.generateJson', { meta: { model: opts.model ?? 'gemini-2.5-flash' } });
  return JSON.parse(response.text);
}

export async function generateMultimodal(parts, opts = {}) {
  // parts is an array like [{ inlineData: { mimeType, data } }, { text: '...' }]
  const response = await ai.models.generateContent({
    model: opts.model ?? 'gemini-2.5-flash',
    contents: { parts },
    config: opts.config ?? {}
  });
  logger.info('gemini.generateMultimodal', { meta: { parts: parts.length } });
  return response;
}

export function createChat(systemInstruction = 'You are a helpful assistant.', opts = {}) {
  const chat = ai.chats.create({
    model: opts.model ?? 'gemini-2.5-flash',
    config: { systemInstruction }
  });
  logger.info('gemini.chatCreated', { meta: { model: opts.model ?? 'gemini-2.5-flash' } });
  return chat;
}
