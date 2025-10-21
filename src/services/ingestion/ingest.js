import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { createRequire } from 'module';
import { getCollection } from '../rag.js';

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse'); // ✅ perbaikan untuk ESM + pdf-parse CommonJS

/**
 * Split teks PDF menjadi potongan (chunks)
 */
async function pdfToChunks(fp, chunkSize = 1200, overlap = 150) {
  const raw = await pdf(fs.readFileSync(fp));
  const text = raw.text.replace(/\s+\n/g, '\n').trim();
  const chunks = [];
  for (let i = 0; i < text.length; i += (chunkSize - overlap)) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Ingest semua dokumen PDF ke vector DB (Chroma)
 */
async function ingestDocs() {
  const docsDir = path.resolve('src/services/ingestion/docs');
  if (!fs.existsSync(docsDir)) {
    console.error(`❌ Folder ${docsDir} tidak ditemukan`);
    process.exit(1);
  }

  const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.pdf'));
  if (!files.length) {
    console.warn('⚠️ Tidak ada file PDF di folder docs');
    return;
  }

  const col = await getCollection();

  for (const f of files) {
    const full = path.join(docsDir, f);
    let docType = 'other';
    const name = f.toLowerCase();

    if (name.includes('job')) docType = 'job_description';
    else if (name.includes('rubric') && !name.includes('cv')) docType = 'rubric_project';
    else if (name.includes('case')) docType = 'case_study';
    else if (name.includes('cv') || name.includes('submission')) docType = 'rubric_cv';

    console.log(`📄 Memproses ${f} (${docType})...`);

    const chunks = await pdfToChunks(full);
    const ids = chunks.map(() => uuidv4());
    const metadatas = chunks.map(() => ({ doc_type: docType, file: f }));

    try {
      await col.delete({ where: { file: f } });
    } catch {}

    await col.add({ ids, documents: chunks, metadatas });
    console.log(`✅ Ingested ${f} as ${docType} (${chunks.length} chunks)`);
  }

  console.log('📚 Semua dokumen selesai diingest.');
}

(async () => {
  try {
    await ingestDocs();
  } catch (err) {
    console.error('❌ Gagal ingestion:', err);
  } finally {
    process.exit(0);
  }
})();
