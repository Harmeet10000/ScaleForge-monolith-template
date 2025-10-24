import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

export const classifyEmails = async (emails, geminiApiKey) => {
  const model = new ChatGoogleGenerativeAI({
    apiKey: geminiApiKey,
    model: 'gemini-2.0-flash-exp'
  });

  const prompt = `Classify the following emails into one of these categories: important, promotions, social, marketing, spam, general.
Return ONLY a JSON array with the email IDs and their categories. No additional text.

Format: [{"id": "email_id", "category": "category_name"}]

Emails:
${emails.map((e) => `ID: ${e.id}\nFrom: ${e.from}\nSubject: ${e.subject}\nSnippet: ${e.snippet}\n`).join('\n---\n')}`;
  const response = await model.invoke(prompt);
  const content =
    typeof response.content === 'string'
      ? response.content.replace(/```json\n?|\n?```/g, '').trim()
      : JSON.stringify(response.content);
  return JSON.parse(content);
};
