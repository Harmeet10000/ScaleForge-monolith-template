import { GoogleGenAI } from '@google/genai';
import { logger } from '../utils/logger.js';

// Initialize the client with the API key from the environment variable.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const main = async () => {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: 'Explain how AI works in a few words',
    config: {
      thinkingConfig: {
        // thinkingBudget: 0 // Disables thinking
      }
    }
  });
  logger.info('AI Response', { meta: { response: response.text } });
};
