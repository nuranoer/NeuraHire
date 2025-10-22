import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import { pool } from '../db.js';
import { pdfToText } from '../util/pdf.js';

const upload = multer({ dest: 'uploads/' });
export const uploadRouter = Router();

uploadRouter.post('/', upload.fields([{ name: 'cv', maxCount: 1 }, { name: 'report', maxCount: 1 }]), async (req, res) => {
  try {
    const cv = req.files?.cv?.[0];
    const report = req.files?.report?.[0];
    if (!cv || !report) return res.status(400).json({ error: 'Both cv and report are required' });

    const saveFile = async (f, type) => {
      if (f.mimetype !== 'application/pdf') throw new Error(`Invalid MIME for ${type}`);
      const id = uuid();
      const finalPath = path.join('uploads', `${id}.pdf`);
      await fs.promises.rename(f.path, finalPath);
      const text = await pdfToText(finalPath);

      await pool.execute(
        `INSERT INTO files (id,type,filename,path,mime,parsed_text) VALUES (?,?,?,?,?,?)`,
        [id, type, f.originalname, finalPath, f.mimetype, text]
      );
      return id;
    };

    const cvId = await saveFile(cv, 'cv');
    const reportId = await saveFile(report, 'report');

    return res.json({ cv_id: cvId, report_id: reportId });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});
