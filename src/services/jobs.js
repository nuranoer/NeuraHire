import { pool } from '../db.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logger.js';

export async function enqueueJob({ job_title, cv_file_id, report_file_id }) {
  const id = uuidv4();
  await pool.execute(
    'INSERT INTO jobs (id, job_title, cv_file_id, report_file_id, status) VALUES (?,?,?,?,?)',
    [id, job_title, cv_file_id, report_file_id, 'queued']
  );
  logger.info(`Enqueued job ${id}`);
  return id;
}

export async function getJobWithResult(id) {
  const [rows] = await pool.execute('SELECT * FROM jobs WHERE id=?', [id]);
  if (!rows.length) return null;
  const job = rows[0];
  if (job.status === 'completed') {
    const [evs] = await pool.execute('SELECT * FROM evaluations WHERE job_id=?', [id]);
    return {
      id,
      status: job.status,
      result: evs[0] ? {
        cv_match_rate: Number(evs[0].cv_match_rate),
        cv_feedback: evs[0].cv_feedback,
        project_score: Number(evs[0].project_score),
        project_feedback: evs[0].project_feedback,
        overall_summary: evs[0].overall_summary
      } : null
    };
  }
  return { id, status: job.status };
}
