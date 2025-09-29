import { httpResponse } from '../../utils/httpResponse.js';
import { SUCCESS } from '../auth/authConstants.js';
import {
  generateText,
  generateTextStream,
  embedText,
  generateImage,
  generateVideo,
  generateJson,
  generateMultimodal,
  createChat,
  ai
} from '../../helpers/gemini.js';
import asyncHandler from 'express-async-handler';

export const generateTextHandler = asyncHandler(async (req, res) => {
  const { prompt, model, config } = req.body;
  const text = await generateText(prompt, { model, config });
  httpResponse(req, res, 200, SUCCESS, { text });
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
  httpResponse(req, res, 200, SUCCESS, { embedding });
});

export const generateImageHandler = asyncHandler(async (req, res) => {
  const { prompt, model, config } = req.body;
  const base64 = await generateImage(prompt, { model, config });
  httpResponse(req, res, 200, SUCCESS, { imageBase64: base64 });
});

export const generateVideoHandler = asyncHandler(async (req, res) => {
  const { prompt, model, config, poll } = req.body;
  const operation = await generateVideo(prompt, { model, config });
  if (!poll) {
    return httpResponse(req, res, 200, SUCCESS, { operation });
  }
  let op = operation;
  while (!op.done) {
    await new Promise((r) => setTimeout(r, 3000));
    op = await ai.operations.getVideosOperation({ operation: op });
  }
  const downloadLink = op.response?.generatedVideos?.[0]?.video?.uri;
  httpResponse(req, res, 200, SUCCESS, { downloadLink });
});

export const generateJsonHandler = asyncHandler(async (req, res) => {
  const { prompt, schema, model, config } = req.body;
  const json = await generateJson(prompt, schema, { model, config });
  httpResponse(req, res, 200, SUCCESS, { json });
});

export const generateMultimodalHandler = asyncHandler(async (req, res) => {
  const { parts, model, config } = req.body;
  const response = await generateMultimodal(parts, { model, config });
  httpResponse(req, res, 200, SUCCESS, { response });
});

export const createChatHandler = asyncHandler(async (req, res) => {
  const { systemInstruction, model } = req.body;
  const chat = createChat(systemInstruction, { model });
  httpResponse(req, res, 200, SUCCESS, { chatId: chat.id ?? null });
});
