-- Đặt charset UTF-8 đầy đủ cho tiếng Việt
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- Users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE COLLATE utf8mb4_unicode_ci,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) COLLATE utf8mb4_unicode_ci,
    role ENUM('USER','ADMIN') NOT NULL DEFAULT 'USER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    token VARCHAR(512) NOT NULL UNIQUE,
    expired_at DATETIME(6) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tags
CREATE TABLE IF NOT EXISTS tags (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(50) NOT NULL COLLATE utf8mb4_unicode_ci,
    color VARCHAR(7),
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_tag_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uq_user_tag (user_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notes (lưu tiếng Việt đầy đủ)
CREATE TABLE IF NOT EXISTS notes (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL COLLATE utf8mb4_unicode_ci,
    content LONGTEXT COLLATE utf8mb4_unicode_ci,
    is_bookmarked BOOLEAN NOT NULL DEFAULT FALSE,
    is_embedded BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6),
    CONSTRAINT fk_note_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note-tag join
CREATE TABLE IF NOT EXISTS note_tags (
    note_id VARCHAR(36) NOT NULL,
    tag_id  VARCHAR(36) NOT NULL,
    PRIMARY KEY (note_id, tag_id),
    CONSTRAINT fk_nt_note FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    CONSTRAINT fk_nt_tag  FOREIGN KEY (tag_id)  REFERENCES tags(id)  ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Documents
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL COLLATE utf8mb4_unicode_ci,
    file_type ENUM('PDF','DOCX','TXT','AUDIO') NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    extracted_text LONGTEXT COLLATE utf8mb4_unicode_ci,
    ai_summary TEXT COLLATE utf8mb4_unicode_ci,
    audio_transcript LONGTEXT COLLATE utf8mb4_unicode_ci,
    audio_duration_seconds INT,
    status ENUM('PENDING','PROCESSING','DONE','FAILED') NOT NULL DEFAULT 'PENDING',
    is_embedded BOOLEAN NOT NULL DEFAULT FALSE,
    uploaded_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6),
    CONSTRAINT fk_doc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) COLLATE utf8mb4_unicode_ci,
    context_type ENUM('NOTES','DOCUMENT','ALL') NOT NULL DEFAULT 'NOTES',
    context_id VARCHAR(36),
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6),
    CONSTRAINT fk_cs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(36) PRIMARY KEY,
    session_id VARCHAR(36) NOT NULL,
    role ENUM('USER','ASSISTANT') NOT NULL,
    content TEXT NOT NULL COLLATE utf8mb4_unicode_ci,
    source_chunks TEXT COLLATE utf8mb4_unicode_ci,
    token_count INT,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_cm_session FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Schedules
CREATE TABLE IF NOT EXISTS schedules (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    note_id VARCHAR(36),
    task_name VARCHAR(255) NOT NULL COLLATE utf8mb4_unicode_ci,
    description TEXT COLLATE utf8mb4_unicode_ci,
    deadline DATE,
    priority ENUM('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
    is_done BOOLEAN NOT NULL DEFAULT FALSE,
    extracted_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6),
    CONSTRAINT fk_sch_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sch_note FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Knowledge groups
CREATE TABLE IF NOT EXISTS knowledge_groups (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    group_name VARCHAR(100) NOT NULL COLLATE utf8mb4_unicode_ci,
    suggested_by_ai BOOLEAN NOT NULL DEFAULT FALSE,
    ai_reasoning TEXT COLLATE utf8mb4_unicode_ci,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6),
    CONSTRAINT fk_kg_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Knowledge group notes join
CREATE TABLE IF NOT EXISTS knowledge_group_notes (
    group_id VARCHAR(36) NOT NULL,
    note_id  VARCHAR(36) NOT NULL,
    PRIMARY KEY (group_id, note_id),
    CONSTRAINT fk_kgn_group FOREIGN KEY (group_id) REFERENCES knowledge_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_kgn_note  FOREIGN KEY (note_id)  REFERENCES notes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- System prompts
CREATE TABLE IF NOT EXISTS system_prompts (
    id VARCHAR(36) PRIMARY KEY,
    prompt_key VARCHAR(100) NOT NULL UNIQUE,
    prompt_text TEXT NOT NULL COLLATE utf8mb4_unicode_ci,
    description VARCHAR(255) COLLATE utf8mb4_unicode_ci,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by VARCHAR(36),
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    title VARCHAR(255) NOT NULL COLLATE utf8mb4_unicode_ci,
    message TEXT NOT NULL COLLATE utf8mb4_unicode_ci,
    is_broadcast BOOLEAN NOT NULL DEFAULT FALSE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_by VARCHAR(36),
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(36),
    detail TEXT COLLATE utf8mb4_unicode_ci,
    ip_address VARCHAR(45),
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_al_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
