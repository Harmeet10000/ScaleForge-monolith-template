# Gemini API JS/TS SDK Guide

A quick reference guide for using the `@google/genai` SDK to interact with the Gemini API.

## 1. Initialization

Always import `GoogleGenAI` and initialize the client with a named `apiKey` parameter from `process.env`.

```typescript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
```

**Note:** The API key must be provided via the `process.env.API_KEY` environment variable. The application should not include UI for managing this key.

## 2. Models

Use the appropriate model for your task:

- **General Text:** `'gemini-2.5-flash'`
- **Image Generation:** `'imagen-4.0-generate-001'`
- **Image Editing:** `'gemini-2.5-flash-image-preview'`
- **Video Generation:** `'veo-2.0-generate-001'`
- **Text Embeddings:** `'text-embedding-004'` (Note: Check official documentation for the latest embedding models).

## 3. Generate Content

### Text from Text Prompt

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'Why is the sky blue?'
});

const text = response.text; // Correct way to access text
console.log(text);
```

### Stream Text from Text Prompt

```typescript
const responseStream = await ai.models.generateContentStream({
  model: 'gemini-2.5-flash',
  contents: 'Tell me a long story about a brave robot.'
});

for await (const chunk of responseStream) {
  console.log(chunk.text);
}
```

### Text from Multimodal Input (Image + Text)

```typescript
// Assumes base64EncodeString is a Base64 encoded image string
const imagePart = {
  inlineData: {
    mimeType: 'image/png',
    data: base64EncodeString
  }
};
const textPart = {
  text: 'What is in this picture?'
};

const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: { parts: [imagePart, textPart] }
});

console.log(response.text);
```

## 4. Chat

For conversational interactions, create a chat session.

### Standard Chat

```typescript
import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const chat: Chat = ai.chats.create({
  model: 'gemini-2.5-flash',
  config: {
    systemInstruction: 'You are a helpful assistant.'
  }
});

let response: GenerateContentResponse = await chat.sendMessage({ message: 'Hello!' });
console.log(response.text);

response = await chat.sendMessage({ message: 'What can you do?' });
console.log(response.text);
```

### Streaming Chat

```typescript
const chat: Chat = ai.chats.create({ model: 'gemini-2.5-flash' });

const responseStream = await chat.sendMessageStream({ message: 'Tell me a story in 100 words.' });
for await (const chunk of responseStream) {
  console.log(chunk.text);
}
```

## 5. Generate Text Embeddings

Embeddings create numerical vector representations of text, which is useful for semantic search, classification, and clustering.

```typescript
const response = await ai.models.embedContent({
  model: 'text-embedding-004', // Specific model for embeddings
  content: 'What is the meaning of life?'
});

const embedding = response.embedding.values;
console.log(embedding); // Outputs an array of numbers, e.g., [0.01, -0.02, ...]
```

## 6. JSON Mode

Force the model to output a JSON object that matches a specified schema.

```typescript
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'List three popular cookie recipes with ingredients.',
  config: {
    responseMimeType: 'application/json',
    responseSchema: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          recipeName: { type: Type.STRING },
          ingredients: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      }
    }
  }
});

const jsonOutput = JSON.parse(response.text);
console.log(jsonOutput);
```

## 7. Image Generation

Use the `imagen-4.0-generate-001` model.

```typescript
const response = await ai.models.generateImages({
  model: 'imagen-4.0-generate-001',
  prompt: 'A photo of a majestic lion in the savanna.',
  config: {
    numberOfImages: 1,
    outputMimeType: 'image/jpeg',
    aspectRatio: '16:9'
  }
});

const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
// You can now use this imageUrl in an <img> tag src attribute.
```

## 8. Image Editing

Use the `gemini-2.5-flash-image-preview` model.

```typescript
import { GoogleGenAI, Modality } from '@google/genai';

// Assumes base64ImageData is a Base64 encoded image string
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash-image-preview',
  contents: {
    parts: [
      {
        inlineData: { data: base64ImageData, mimeType: 'image/png' }
      },
      { text: 'make the background a starry night' }
    ]
  },
  config: {
    responseModalities: [Modality.IMAGE, Modality.TEXT]
  }
});

for (const part of response.candidates[0].content.parts) {
  if (part.inlineData) {
    const base64ImageBytes: string = part.inlineData.data;
    const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
    console.log(`Generated Image URL: ${imageUrl}`);
  }
}
```

## 9. Video Generation

Use the `veo-2.0-generate-001` model. This is a long-running operation.

```typescript
let operation = await ai.models.generateVideos({
  model: 'veo-2.0-generate-001',
  prompt: 'A futuristic cityscape at sunset, with flying cars.',
  config: { numberOfVideos: 1 }
});

while (!operation.done) {
  console.log('Waiting for video generation...');
  await new Promise((resolve) => setTimeout(resolve, 10000));
  operation = await ai.operations.getVideosOperation({ operation: operation });
}

const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
if (downloadLink) {
  // Append your API key to fetch the video file
  const videoUrl = `${downloadLink}&key=${process.env.API_KEY}`;
  console.log(`Video ready: ${videoUrl}`);
}
```

## 10. Google Search Grounding

For up-to-date information, ground the model with Google Search. **You must display the source URLs**.

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'Who won the latest Formula 1 race?',
  config: {
    tools: [{ googleSearch: {} }]
  }
});

console.log(response.text);

// Extract and display source URLs
const citations = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
if (citations) {
  console.log('Sources:');
  citations.forEach((citation) => {
    if (citation.web) {
      console.log(`- ${citation.web.title}: ${citation.web.uri}`);
    }
  });
}
```

## 11. Model Configuration Parameters

You can control the model's behavior using the `config` object.

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'Write a short, creative story about a wizard who loves programming.',
  config: {
    // Controls randomness. Lower values are more deterministic.
    // Range: 0.0 - 1.0. Default is 0.95.
    temperature: 1.0,

    // The cumulative probability of tokens to consider for sampling.
    // Lower values make the output more focused and less random.
    // Range: 0.0 - 1.0.
    topP: 0.95,

    // The maximum number of tokens to consider for sampling.
    // Limits the selection of tokens to the most likely K tokens.
    topK: 64,

    // Maximum number of output tokens.
    maxOutputTokens: 8192,

    systemInstruction: 'You are a creative writing assistant.'
  }
});
```

### Thinking Config (`gemini-2.5-flash` only)

- **Omit `thinkingConfig`** for most tasks to let the model use its default (enabled) for higher quality.
- **Disable thinking** for low-latency tasks like game AI.

```typescript
// Disable thinking for faster, lower-latency response
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'Is the player cheating?',
  config: {
    thinkingConfig: { thinkingBudget: 0 }
  }
});
```

## 12. Best Practices

### Streaming: Backend to Client

To create a real-time typing effect in your web app, stream the response from your backend server to the frontend client.

**Backend (e.g., Node.js with Express/Next.js API Route):**

The backend initiates the stream with the Gemini API and pipes the chunks to the client as they arrive.

```typescript
// Example using a generic Server Response object
async function handler(req, res) {
  // Set headers for streaming
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Transfer-Encoding', 'chunked');

  try {
    const { prompt } = req.body;
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-2.5-flash',
      contents: prompt
    });

    for await (const chunk of responseStream) {
      res.write(chunk.text); // Write each chunk to the response stream
    }
    res.end(); // End the stream when done
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred.');
  }
}
```

**Frontend (Browser JavaScript):**

The client uses the `fetch` API to read the stream and update the UI.

```javascript
async function streamResponse() {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Tell me a story...' })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const contentElement = document.getElementById('content');

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const textChunk = decoder.decode(value);
    contentElement.innerText += textChunk;
  }
}
```

### Error Handling

API calls can fail. Wrap your SDK calls in `try...catch` blocks to handle errors gracefully. Implement retry logic, such as exponential backoff, for transient network issues.

### API Key Security

**Never** expose your API key on the client-side. The SDK should always be used on a server (backend) where the key can be securely loaded from environment variables (`process.env.API_KEY`).

Context URLs Retrieved:
https://ai.google.dev/gemini-api/docs/rate-limitsSUCCESS
https://ai.google.dev/gemini-api/docs/quickstartSUCCESS
https://ai.google.dev/gemini-api/docsSUCCESS
https://ai.google.dev/gemini-api/docs/api-keySUCCESS
https://ai.google.dev/gemini-api/docs/pricingSUCCESS
https://ai.google.dev/gemini-api/docs/modelsSUCCESS
https://ai.google.dev/gemini-api/docs/librariesSUCCESS
https://ai.google.dev/gemini-api/docs/changelogSUCCESS
https://ai.google.dev/gemini-api/docs/billingSUCCESS
