import { GoogleGenAI } from '@google/genai';
import { logger } from '../utils/logger.js';
import asyncHandler from 'express-async-handler';

// Initialize the client with the API key from the environment variable.
// Prefer a generic `API_KEY` env var to align with docs (`docs/gemini.md`).
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY ?? process.env.GEMINI_API_KEY });

// -- Core SDK wrappers (no try/catch here; errors bubble up to the caller / async wrapper)
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

export async function embedText(text, opts = {}) {
  const response = await ai.models.embedContent({
    model: opts.model ?? 'text-embedding-004',
    content: text
  });
  logger.info('gemini.embedText', { meta: { length: response?.embedding?.values?.length ?? 0 } });
  return response.embedding?.values ?? [];
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

// -- Express handlers (wrapped with asyncHandler to avoid local try/catch)
export const generateTextHandler = asyncHandler(async (req, res) => {
  const { prompt, model, config } = req.body;
  const text = await generateText(prompt, { model, config });
  res.json({ text });
});

export const generateTextStreamHandler = asyncHandler(async (req, res) => {
  const { prompt, model, config } = req.body;
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');
  const stream = await generateTextStream(prompt, { model, config });
  for await (const chunk of stream) {
    if (chunk?.text) {
      res.write(chunk.text);
    }
  }
  res.end();
});

export const embedTextHandler = asyncHandler(async (req, res) => {
  const { text, model } = req.body;
  const embedding = await embedText(text, { model });
  res.json({ embedding });
});

export const generateImageHandler = asyncHandler(async (req, res) => {
  const { prompt, model, config } = req.body;
  const base64 = await generateImage(prompt, { model, config });
  res.json({ imageBase64: base64 });
});

export const generateVideoHandler = asyncHandler(async (req, res) => {
  const { prompt, model, config, poll } = req.body;
  const operation = await generateVideo(prompt, { model, config });
  // If caller wants immediate operation object, return it.
  if (!poll) {
    return res.json({ operation });
  }

  // Poll until done (note: long-running)
  let op = operation;
  while (!op.done) {
    await new Promise((r) => setTimeout(r, 3000));
    op = await ai.operations.getVideosOperation({ operation: op });
  }
  const downloadLink = op.response?.generatedVideos?.[0]?.video?.uri;
  res.json({ downloadLink });
});

export const generateJsonHandler = asyncHandler(async (req, res) => {
  const { prompt, schema, model, config } = req.body;
  const json = await generateJson(prompt, schema, { model, config });
  res.json({ json });
});

export const generateMultimodalHandler = asyncHandler(async (req, res) => {
  const { parts, model, config } = req.body;
  const response = await generateMultimodal(parts, { model, config });
  res.json({ response });
});

export const createChatHandler = asyncHandler(async (req, res) => {
  const { systemInstruction, model } = req.body;
  const chat = createChat(systemInstruction, { model });
  res.json({ chatId: chat.id ?? null });
});

export const chatSendMessageHandler = asyncHandler(async (req, res) => {
  const { chatInstance, message } = req.body; // chatInstance should be a Chat created previously
  const response = await chatInstance.sendMessage({ message });
  res.json({ text: response.text });
});
