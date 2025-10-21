import { pool } from '../db.js';
import { embedOne } from '../util/embeddings.js';
import { cosineSim } from '../util/cosine.js';
import { config } from '../config.js';

export async function topKChunks({ query, docTypes, k = config.chunk.topK }) {
  const qEmbed = await embedOne(query);

  // Pull candidates (simple: pull up to 1000 chunks of the requested types)
  const [rows] = await pool.execute(
    `SELECT id, text, embedding FROM doc_chunks
     WHERE doc_type IN (${docTypes.map(() => '?').join(',')})
     LIMIT 1000`,
    docTypes
  );
  const scored = rows.map(r => {
    const emb = JSON.parse(r.embedding);
    return { id: r.id, text: r.text, score: cosineSim(qEmbed, emb) };
  }).sort((a, b) => b.score - a.score);

  return scored.slice(0, k);
}

// Helper to join contexts
export async function buildContext(docTypes, seed) {
  const chunks = await topKChunks({ query: seed, docTypes });
  return chunks.map(c => c.text).join('\n---\n');
}
