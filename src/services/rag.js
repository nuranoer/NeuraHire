// src/services/rag.js
import { ChromaClient } from 'chromadb';
import { embedTexts } from './gemini.js';

const client = new ChromaClient({ path: './vector_store' });
const COLLECTION = 'neurahire_docs';

// Simple embedding function untuk Chroma v3
class GeminiEmbeddingFunction {
  async generate(texts) {
    return await embedTexts(texts);
  }
}

const ef = new GeminiEmbeddingFunction();

export async function getCollection() {
  try {
    return await client.getCollection({ name: COLLECTION });
  } catch {
    return await client.createCollection({ name: COLLECTION, embeddingFunction: ef });
  }
}

/**
 * Query RAG
 * @param {string} query
 * @param {object} where
 * @param {number} k
 */
export async function retrieveContext(query, where, k = 6) {
  const col = await getCollection();
  const res = await col.query({
    queryTexts: [query],
    nResults: k,
    where
  });
  const docs = res.documents?.[0] || [];
  return docs.join('\n---\n').slice(0, 8000);
}
