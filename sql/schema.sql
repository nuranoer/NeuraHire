CREATE DATABASE IF NOT EXISTS neurahire CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE neurahire;

-- Uploaded & internal docs
CREATE TABLE IF NOT EXISTS documents (
  id CHAR(36) PRIMARY KEY,
  type ENUM('cv','report','job_desc','brief','rubric_cv','rubric_proj') NOT NULL,
  filename VARCHAR(255) NOT NULL,
  path VARCHAR(512) NOT NULL,
  mime VARCHAR(64) NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  parsed_text LONGTEXT NULL
) ENGINE=InnoDB;

-- Embeddings for RAG (each chunk is a row)
CREATE TABLE IF NOT EXISTS doc_chunks (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  document_id CHAR(36) NOT NULL,
  doc_type ENUM('job_desc','brief','rubric_cv','rubric_proj') NOT NULL,
  chunk_index INT NOT NULL,
  text MEDIUMTEXT NOT NULL,
  embedding JSON NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Evaluation jobs
CREATE TABLE IF NOT EXISTS jobs (
  id CHAR(36) PRIMARY KEY,
  job_title VARCHAR(255) NOT NULL,
  cv_doc_id CHAR(36) NOT NULL,
  report_doc_id CHAR(36) NOT NULL,
  status ENUM('queued','processing','completed','failed') NOT NULL DEFAULT 'queued',
  error TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX(status),
  FOREIGN KEY (cv_doc_id) REFERENCES documents(id) ON DELETE RESTRICT,
  FOREIGN KEY (report_doc_id) REFERENCES documents(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Final results
CREATE TABLE IF NOT EXISTS evaluations (
  id CHAR(36) PRIMARY KEY,
  job_id CHAR(36) NOT NULL,
  cv_match_rate DECIMAL(5,4) NULL,
  cv_feedback TEXT NULL,
  project_score DECIMAL(3,1) NULL,
  project_feedback TEXT NULL,
  overall_summary TEXT NULL,
  raw JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB;
