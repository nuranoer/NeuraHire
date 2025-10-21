import pRetry from 'p-retry';
import { textModel } from './gemini.js';
import { parsePdfToText } from './parser.js';
import { retrieveContext } from './rag.js';

const MAX_RETRIES = Number(process.env.EVAL_MAX_RETRIES || 3);
const INITIAL_DELAY_MS = Number(process.env.EVAL_INITIAL_DELAY_MS || 1000);
const BACKOFF = Number(process.env.EVAL_BACKOFF_FACTOR || 2);

async function askLLM(prompt, systemHint='You are a precise evaluator. Return valid JSON only.') {
  const model = textModel();
  const run = async () => {
    const res = await model.generateContent([
      { role: 'user', parts: [{ text: `${systemHint}\n\n${prompt}` }] }
    ]);
    return res.response.text();
  };

  return pRetry(run, {
    retries: MAX_RETRIES,
    factor: BACKOFF,
    minTimeout: INITIAL_DELAY_MS
  });
}

export async function evaluateAll({ jobTitle, cvText, reportText }) {
  // 1) CV Evaluation
  const cvGround = await retrieveContext(
    `Job title: ${jobTitle}. What are the required skills and experience?`,
    { doc_type: 'job_description' }
  );
  const cvRubric = await retrieveContext('CV scoring rubric for backend candidate', { doc_type: 'rubric_cv' });

  const cvPrompt = `
=== JOB TITLE ===
${jobTitle}

=== JOB DESCRIPTION GROUND TRUTH ===
${cvGround}

=== CV TEXT ===
${cvText.slice(0, 35000)}

=== SCORING RUBRIC (CV) ===
${cvRubric}

Return JSON: {"cv_match_rate": <0..1>, "cv_feedback": "<concise text>"}.
Use decimal with 2 digits.
`;
  const cvRaw = await askLLM(cvPrompt);
  const cv = safeJson(cvRaw, { cv_match_rate: 0, cv_feedback: 'N/A' });

  // 2) Project Report Evaluation
  const csGround = await retrieveContext(
    'Case study requirements, pipeline, deliverables, async evaluation',
    { doc_type: 'case_study' }
  );
  const prRubric = await retrieveContext('Project scoring rubric for backend AI pipeline', { doc_type: 'rubric_project' });

  const prPrompt = `
=== CASE STUDY GROUND TRUTH ===
${csGround}

=== PROJECT REPORT TEXT ===
${reportText.slice(0, 35000)}

=== SCORING RUBRIC (PROJECT) ===
${prRubric}

Score each (1-5): correctness, code_quality, resilience, documentation, creativity.
Return JSON:
{
 "project_score": <1..5, decimal allowed>,
 "project_feedback": "<concise text>"
}
`;
  const prRaw = await askLLM(prPrompt);
  const pr = safeJson(prRaw, { project_score: 0, project_feedback: 'N/A' });

  // 3) Final summary
  const finalPrompt = `
Given:
CV match rate: ${cv.cv_match_rate}
CV feedback: ${cv.cv_feedback}
Project score: ${pr.project_score}
Project feedback: ${pr.project_feedback}

Write a 1-3 sentence concise overall summary.
Return JSON: {"overall_summary": "<text>"}.
`;
  const finalRaw = await askLLM(finalPrompt);
  const final = safeJson(finalRaw, { overall_summary: 'N/A' });

  return { ...cv, ...pr, ...final };
}

export async function parseInputs(cvPath, reportPath) {
  const [cvText, reportText] = await Promise.all([parsePdfToText(cvPath), parsePdfToText(reportPath)]);
  return { cvText, reportText };
}

function safeJson(txt, fallback) {
  try {
    const start = txt.indexOf('{');
    const end = txt.lastIndexOf('}');
    const json = txt.slice(start, end + 1);
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}
