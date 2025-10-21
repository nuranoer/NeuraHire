export const prompts = {
  cvEval: ({ jd, rubricCv, cvText }) => ({
    system:
`You are a strict technical recruiter. Score the CV against the job description and CV rubric.
Return STRICT JSON.`,
    user:
`CONTEXT - Job Description:
${jd}

CONTEXT - CV Rubric:
${rubricCv}

INPUT - Candidate CV:
${cvText}

TASK:
1) cv_match_rate in [0..1]
2) cv_feedback ≤ 120 words, actionable`,
    schema: `{"cv_match_rate": number, "cv_feedback": string}`
  }),

  projectEval: ({ brief, rubricProj, reportText }) => ({
    system:
`You are a senior backend engineer reviewing a case study report.
Return STRICT JSON.`,
    user:
`CONTEXT - Case Study Brief:
${brief}

CONTEXT - Project Rubric:
${rubricProj}

INPUT - Candidate Project Report:
${reportText}

TASK:
1) project_score in [1..5]
2) project_feedback ≤ 150 words`,
    schema: `{"project_score": number, "project_feedback": string}`
  }),

  finalSynth: ({ jobTitle, cvMatchRate, cvFeedback, projectScore, projectFeedback }) => ({
    system:
`You are summarizing candidate fit for the role. Return STRICT JSON.`,
    user:
`JOB TITLE: ${jobTitle}
INPUT:
cv_match_rate=${cvMatchRate}
cv_feedback=${cvFeedback}
project_score=${projectScore}
project_feedback=${projectFeedback}

TASK:
Return overall_summary in 3–5 sentences (strengths, gaps, recommendation).`,
    schema: `{"overall_summary": string}`
  })
};
