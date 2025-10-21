import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { pool } from '../db.js';

export const evaluateRouter = Router();

evaluateRouter.post('/', async (req, res) => {
  try {
    const { job_title, cv_id, report_id } = req.body || {};
    if (!job_title || !cv_id || !report_id) {
      return res.status(400).json({ error: 'job_title, cv_id, report_id are required' });
    }
    const id = uuid();
    await pool.execute(
      `INSERT INTO jobs (id, job_title, cv_doc_id, report_doc_id, status) VALUES (?,?,?,?, 'queued')`,
      [id, job_title, cv_id, report_id]
    );
    return res.json({ id, status: 'queued' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});
