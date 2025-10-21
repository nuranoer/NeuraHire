import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import { pool } from '../db.js';
import { pdfToText } from '../util/pdf.js';
import { chunkText } from '../util/text.js';
import { embedTexts } from '../util/embeddings.js';
import { config } from '../config.js';

const docsDir = path.resolve('docs');

const files = [
  { fname: 'job_description.pdf', type: 'job_desc' },
  { fname: 'case_study_brief.pdf', type: 'brief' },
  { fname: 'rubric_cv.pdf', type: 'rubric_cv' },
  { fname: 'rubric_project.pdf', type: 'rubric_proj' }
];

async function upsertDoc({ filePath, type }) {
  const id = uuid();
  const filename = path.basename(filePath);
  const mime = 'application/pdf';
  const text = await pdfToText(filePath);

  await pool.execute(
    `INSERT INTO documents (id,type,filename,path,mime,parsed_text) VALUES (?,?,?,?,?,?)`,
    [id, type, filename, filePath, mime, text]
  );

  const chunks = chunkText(text, config.chunk.size, config.chunk.overlap);
  if (chunks.length === 0) return;

  const embeddings = await embedTexts(chunks);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (let i = 0; i < chunks.length; i++) {
      await conn.execute(
        `INSERT INTO doc_chunks (document_id, doc_type, chunk_index, text, embedding)
         VALUES (?,?,?,?,?)`,
        [id, type, i, chunks[i], JSON.stringify(embeddings[i])]
      );
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

(async () => {
  for (const f of files) {
    const filePath = path.join(docsDir, f.fname);
    if (!fs.existsSync(filePath)) {
      console.warn(`[ingest] Skipped missing: ${filePath}`);
      continue;
    }
    console.log(`[ingest] Processing ${filePath} as ${f.type}...`);
    await upsertDoc({ filePath, type: f.type });
  }
  console.log('[ingest] Done.');
  process.exit(0);
})();
