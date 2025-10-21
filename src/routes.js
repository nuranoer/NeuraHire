import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { pool } from './db.js';
import { enqueueJob, getJobWithResult } from './services/jobs.js';

const upload = multer({ dest: 'uploads/' });
export const router = Router();

/**
 * POST /upload
 * Form-data: cv (file PDF), report (file PDF)
 */
router.post('/upload', upload.fields([{ name: 'cv', maxCount: 1 }, { name: 'report', maxCount: 1 }]), async (req, res) => {
  try {
    const cv = req.files?.cv?.[0];
    const rp = req.files?.report?.[0];
    if (!cv || !rp) return res.status(400).json({ message: 'cv dan report wajib diupload (PDF).' });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const cvId = uuidv4();
      const rpId = uuidv4();

      await conn.execute(
        'INSERT INTO files (id, kind, original_name, path, mime, size) VALUES (?,?,?,?,?,?)',
        [cvId, 'cv', cv.originalname, path.resolve(cv.path), cv.mimetype, cv.size]
      );
      await conn.execute(
        'INSERT INTO files (id, kind, original_name, path, mime, size) VALUES (?,?,?,?,?,?)',
        [rpId, 'report', rp.originalname, path.resolve(rp.path), rp.mimetype, rp.size]
      );
      await conn.commit();
      res.json({ cv_file_id: cvId, report_file_id: rpId });
    } finally {
      conn.release();
    }
  } catch (e) {
    res.status(500).json({ message: 'Upload gagal', error: String(e) });
  }
});

/**
 * POST /evaluate
 * Body: { job_title: string, cv_file_id: string, report_file_id: string }
 */
router.post('/evaluate', async (req, res) => {
  const { job_title, cv_file_id, report_file_id } = req.body || {};
  if (!job_title || !cv_file_id || !report_file_id) {
    return res.status(400).json({ message: 'job_title, cv_file_id, report_file_id wajib diisi' });
  }
  const jobId = await enqueueJob({ job_title, cv_file_id, report_file_id });
  res.json({ id: jobId, status: 'queued' });
});

/**
 * GET /result/:id
 */
router.get('/result/:id', async (req, res) => {
  const out = await getJobWithResult(req.params.id);
  if (!out) return res.status(404).json({ message: 'Job tidak ditemukan' });
  res.json(out);
});
