import { Router } from 'express';
import { pool } from '../db.js';

export const resultRouter = Router();

resultRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const [[job]] = await pool.execute(`SELECT * FROM jobs WHERE id=?`, [id]);
  if (!job) return res.status(404).json({ error: 'job not found' });

  if (job.status !== 'completed') {
    return res.json({ id: job.id, status: job.status });
  }
  const [[ev]] = await pool.execute(`SELECT * FROM evaluations WHERE job_id=?`, [id]);
  if (!ev) return res.json({ id: job.id, status: 'completed', result: null });

  return res.json({
    id: job.id,
    status: 'completed',
    result: {
      cv_match_rate: Number(ev.cv_match_rate),
      cv_feedback: ev.cv_feedback,
      project_score: Number(ev.project_score),
      project_feedback: ev.project_feedback,
      overall_summary: ev.overall_summary
    }
  });
});
