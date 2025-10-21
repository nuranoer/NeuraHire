import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

export async function embedTexts(texts) {
  const model = genAI.getGenerativeModel({ model: config.gemini.embedModel });
  // Batch embed sequentially untuk kesederhanaan; bisa di-parallel dengan Promise.all jika perlu
  const out = [];
  for (const t of texts) {
    const resp = await model.embedContent({ content: t || '' });
    // SDK v2: resp.embedding.values; SDK v1beta: resp.data.embedding.values
    const vector = resp?.embedding?.values || resp?.data?.embedding?.values;
    out.push(vector || []);
  }
  return out;
}

export async function embedOne(text) {
  const [e] = await embedTexts([text]);
  return e;
}
