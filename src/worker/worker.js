import { pool } from '../db.js';
import { buildContext } from '../rag/retrieve.js';
import { prompts } from '../llm/prompts.js';
import { chatJson } from '../llm/gemini.js';

async function processOneJob(conn) {
  // lock one queued job
  const [rows] = await conn.query(
    `SELECT * FROM jobs WHERE status='queued' FOR UPDATE SKIP LOCKED LIMIT 1`
  );
  if (rows.length === 0) return false;
  const job = rows[0];

  await conn.execute(`UPDATE jobs SET status='processing' WHERE id=?`, [job.id]);

  try {
    // Load documents
    const [[cvDoc]] = await conn.execute(`SELECT parsed_text FROM documents WHERE id=?`, [job.cv_doc_id]);
    const [[rpDoc]] = await conn.execute(`SELECT parsed_text FROM documents WHERE id=?`, [job.report_doc_id]);

    const cvText = cvDoc?.parsed_text || '';
    const reportText = rpDoc?.parsed_text || '';

    if (!cvText || !reportText) throw new Error('Empty CV or Report text');

    // Build RAG contexts
    const jd = await buildContext(['job_desc'], cvText.slice(0, 1200));
    const rubricCv = await buildContext(['rubric_cv'], 'cv scoring rubric for backend engineer');
    const brief = await buildContext(['brief'], reportText.slice(0, 1200));
    const rubricProj = await buildContext(['rubric_proj'], 'project scoring rubric for backend deliverable');

    // LLM chain: CV evaluation
    const cPrompt = prompts.cvEval({ jd, rubricCv, cvText });
    const cvRes = await chatJson(cPrompt.system, cPrompt.user, cPrompt.schema);
    let cv_match_rate = Number(cvRes.cv_match_rate ?? 0);
    if (Number.isNaN(cv_match_rate)) cv_match_rate = 0;
    cv_match_rate = Math.max(0, Math.min(1, cv_match_rate));
    const cv_feedback = (cvRes.cv_feedback || '').toString().slice(0, 1200);

    // LLM chain: Project evaluation
    const pPrompt = prompts.projectEval({ brief, rubricProj, reportText });
    const pjRes = await chatJson(pPrompt.system, pPrompt.user, pPrompt.schema);
    let project_score = Number(pjRes.project_score ?? 1);
    if (Number.isNaN(project_score)) project_score = 1;
    project_score = Math.max(1, Math.min(5, project_score));
    const project_feedback = (pjRes.project_feedback || '').toString().slice(0, 1500);

    // LLM chain: Final synthesis
    const fPrompt = prompts.finalSynth({
      jobTitle: job.job_title,
      cvMatchRate: cv_match_rate,
      cvFeedback: cv_feedback,
      projectScore: project_score,
      projectFeedback: project_feedback
    });
    const fRes = await chatJson(fPrompt.system, fPrompt.user, fPrompt.schema);
    const overall_summary = (fRes.overall_summary || '').toString().slice(0, 2000);

    // save evaluation
    const evId = crypto.randomUUID ? crypto.randomUUID() : (await import('uuid')).v4();
    await conn.execute(
      `INSERT INTO evaluations (id, job_id, cv_match_rate, cv_feedback, project_score, project_feedback, overall_summary, raw)
       VALUES (?,?,?,?,?,?,?,?)`,
      [evId, job.id, cv_match_rate, cv_feedback, project_score, project_feedback, overall_summary,
       JSON.stringify({ cvRes, pjRes, fRes })]
    );

    await conn.execute(`UPDATE jobs SET status='completed' WHERE id=?`, [job.id]);
    return true;

  } catch (err) {
    console.error('[worker] error:', err.message);
    await conn.execute(`UPDATE jobs SET status='failed', error=? WHERE id=?`, [String(err.message), job.id]);
    return true;
  }
}

async function loop() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const worked = await processOneJob(conn);
    await conn.commit();
    return worked;
  } catch (e) {
    await conn.rollback();
    console.error('[worker] txn error:', e.message);
  } finally {
    conn.release();
  }
  return false;
}

(async () => {
  console.log('[worker] started');
  // simple scheduler
  setInterval(loop, 1000); // every second try to grab one job
})();
