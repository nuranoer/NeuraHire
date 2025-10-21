// src/services/gemini.js
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Text generation (LLM)
export const textModel = () =>
  genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-pro' });

// Embeddings
const embedModel = () =>
  genAI.getGenerativeModel({ model: process.env.GEMINI_EMBED_MODEL || 'text-embedding-004' });

/**
 * Batch embed texts with Gemini
 * @param {string[]} texts
 * @returns {Promise<number[][]>} embeddings
 */
export async function embedTexts(texts) {
  const model = embedModel();

  // SDK tidak punya batch API; lakukan parallel dengan Promise.all (aman untuk puluhan item)
  const results = await Promise.all(
    texts.map(t => model.embedContent({ content: { parts: [{ text: t }] } }))
  );

  // Konsisten: kembalikan array of vectors (numbers[])
  return results.map(r => r.embedding.values);
}
