import 'dotenv/config';
import { pool } from '../db.js';
import { logger } from '../logger.js';
import { evaluateAll, parseInputs } from '../services/evaluation.js';
import fs from 'fs';

const INTERVAL_MS = 2000;

async function tick() {
  // Ambil satu job 'queued'
  const [rows] = await pool.execute('SELECT * FROM jobs WHERE status="queued" ORDER BY created_at LIMIT 1');
  if (!rows.length) return;

  const job = rows[0];
  await pool.execute('UPDATE jobs SET status="processing" WHERE id=?', [job.id]);

  try {
    // Ambil path file
    const [[cv]] = await pool.execute('SELECT * FROM files WHERE id=?', [job.cv_file_id]);
    const [[rp]] = await pool.execute('SELECT * FROM files WHERE id=?', [job.report_file_id]);
    if (!cv || !rp || !fs.existsSync(cv.path) || !fs.existsSync(rp.path)) {
      throw new Error('File tidak ditemukan di server');
    }

    // Parse PDF
    const { cvText, reportText } = await parseInputs(cv.path, rp.path);

    // Evaluasi LLM
    const out = await evaluateAll({ jobTitle: job.job_title, cvText, reportText });

    // Simpan results
    await pool.execute(
      'INSERT INTO evaluations (job_id, cv_match_rate, cv_feedback, project_score, project_feedback, overall_summary) VALUES (?,?,?,?,?,?)',
      [job.id, out.cv_match_rate, out.cv_feedback, out.project_score, out.project_feedback, out.overall_summary]
    );
    await pool.execute('UPDATE jobs SET status="completed" WHERE id=?', [job.id]);
    logger.info(`Job ${job.id} completed`);
  } catch (e) {
    await pool.execute('UPDATE jobs SET status="failed", error=? WHERE id=?', [String(e), job.id]);
    logger.error(`Job ${job.id} failed: ${e}`);
  }
}

setInterval(() => tick().catch(err => logger.error(err)), INTERVAL_MS);
