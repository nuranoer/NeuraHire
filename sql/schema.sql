CREATE DATABASE IF NOT EXISTS screening_ai DEFAULT CHARACTER SET utf8mb4;
USE neura_hire;

-- Tabel file yang diupload kandidat (CV & Report)
CREATE TABLE files (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  kind ENUM('cv','report') NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime VARCHAR(100) NOT NULL,
  path VARCHAR(500) NOT NULL,
  pages INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel dokumen internal (Ground Truth: JD, Case Study Brief, Rubrics)
CREATE TABLE internal_docs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  doc_type ENUM('job_description','case_study_brief','cv_rubric','report_rubric') NOT NULL,
  source_path VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel job evaluasi (antrian asinkron)
CREATE TABLE jobs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  job_title VARCHAR(255) NOT NULL,
  cv_file_id BIGINT NOT NULL,
  report_file_id BIGINT NOT NULL,
  status ENUM('queued','processing','completed','failed') NOT NULL DEFAULT 'queued',
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cv_file_id) REFERENCES files(id),
  FOREIGN KEY (report_file_id) REFERENCES files(id)
);

-- Hasil evaluasi
CREATE TABLE job_results (
  job_id BIGINT PRIMARY KEY,
  cv_match_rate DECIMAL(4,2) NOT NULL,
  cv_feedback TEXT NOT NULL,
  project_score DECIMAL(3,1) NOT NULL,
  project_feedback TEXT NOT NULL,
  overall_summary TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);
