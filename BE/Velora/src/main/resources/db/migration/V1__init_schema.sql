-- ============================================================
-- Velora - SQL Server Schema (UTF-8 / NVARCHAR cho tiếng Việt)
-- ============================================================

-- Users
CREATE TABLE users (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    email           NVARCHAR(255)    NOT NULL UNIQUE,
    password_hash   NVARCHAR(255)    NOT NULL,
    full_name       NVARCHAR(100),
    role            NVARCHAR(20)     NOT NULL DEFAULT 'USER',
    is_active       BIT              NOT NULL DEFAULT 1,
    created_at      DATETIME2(6)     NOT NULL DEFAULT SYSDATETIME(),
    updated_at      DATETIME2(6)
);

-- Refresh tokens
CREATE TABLE refresh_tokens (
    id          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id     UNIQUEIDENTIFIER NOT NULL,
    token       NVARCHAR(512)    NOT NULL UNIQUE,
    expired_at  DATETIME2(6)     NOT NULL,
    created_at  DATETIME2(6)     NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tags
CREATE TABLE tags (
    id          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id     UNIQUEIDENTIFIER NOT NULL,
    name        NVARCHAR(50)     NOT NULL,
    color       NVARCHAR(7),
    created_at  DATETIME2(6)     NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT fk_tag_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_tag UNIQUE (user_id, name)
);

-- Notes
CREATE TABLE notes (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id         UNIQUEIDENTIFIER NOT NULL,
    title           NVARCHAR(255)    NOT NULL,
    content         NVARCHAR(MAX),
    is_bookmarked   BIT              NOT NULL DEFAULT 0,
    is_embedded     BIT              NOT NULL DEFAULT 0,
    created_at      DATETIME2(6)     NOT NULL DEFAULT SYSDATETIME(),
    updated_at      DATETIME2(6),
    CONSTRAINT fk_note_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Note-tag join
CREATE TABLE note_tags (
    note_id     UNIQUEIDENTIFIER NOT NULL,
    tag_id      UNIQUEIDENTIFIER NOT NULL,
    PRIMARY KEY (note_id, tag_id),
    CONSTRAINT fk_nt_note FOREIGN KEY (note_id) REFERENCES notes(id)  ON DELETE CASCADE,
    CONSTRAINT fk_nt_tag  FOREIGN KEY (tag_id)  REFERENCES tags(id)
);

-- Documents
CREATE TABLE documents (
    id                      UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id                 UNIQUEIDENTIFIER NOT NULL,
    file_name               NVARCHAR(255)    NOT NULL,
    original_name           NVARCHAR(255)    NOT NULL,
    file_type               NVARCHAR(10)     NOT NULL,
    storage_path            NVARCHAR(500)    NOT NULL,
    file_size               BIGINT,
    extracted_text          NVARCHAR(MAX),
    ai_summary              NVARCHAR(MAX),
    audio_transcript        NVARCHAR(MAX),
    audio_duration_seconds  INT,
    status                  NVARCHAR(20)     NOT NULL DEFAULT 'PENDING',
    is_embedded             BIT              NOT NULL DEFAULT 0,
    uploaded_at             DATETIME2(6)     NOT NULL DEFAULT SYSDATETIME(),
    updated_at              DATETIME2(6),
    CONSTRAINT fk_doc_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Chat sessions
CREATE TABLE chat_sessions (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id         UNIQUEIDENTIFIER NOT NULL,
    title           NVARCHAR(255),
    context_type    NVARCHAR(20)     NOT NULL DEFAULT 'NOTES',
    context_id      UNIQUEIDENTIFIER,
    created_at      DATETIME2(6)     NOT NULL DEFAULT SYSDATETIME(),
    updated_at      DATETIME2(6),
    CONSTRAINT fk_cs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Chat messages
CREATE TABLE chat_messages (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    session_id      UNIQUEIDENTIFIER NOT NULL,
    role            NVARCHAR(10)     NOT NULL,
    content         NVARCHAR(MAX)    NOT NULL,
    source_chunks   NVARCHAR(MAX),
    token_count     INT,
    created_at      DATETIME2(6)     NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT fk_cm_session FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
);

-- Schedules
CREATE TABLE schedules (
    id                  UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id             UNIQUEIDENTIFIER NOT NULL,
    note_id             UNIQUEIDENTIFIER,
    task_name           NVARCHAR(255)    NOT NULL,
    description         NVARCHAR(MAX),
    deadline            DATE,
    priority            NVARCHAR(10)     NOT NULL DEFAULT 'MEDIUM',
    is_done             BIT              NOT NULL DEFAULT 0,
    extracted_by_ai     BIT              NOT NULL DEFAULT 0,
    created_at          DATETIME2(6)     NOT NULL DEFAULT SYSDATETIME(),
    updated_at          DATETIME2(6),
    CONSTRAINT fk_sch_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_sch_note FOREIGN KEY (note_id) REFERENCES notes(id)
);

-- Knowledge groups
CREATE TABLE knowledge_groups (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id         UNIQUEIDENTIFIER NOT NULL,
    group_name      NVARCHAR(100)    NOT NULL,
    suggested_by_ai BIT              NOT NULL DEFAULT 0,
    ai_reasoning    NVARCHAR(MAX),
    created_at      DATETIME2(6)     NOT NULL DEFAULT SYSDATETIME(),
    updated_at      DATETIME2(6),
    CONSTRAINT fk_kg_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Knowledge group notes join
CREATE TABLE knowledge_group_notes (
    group_id    UNIQUEIDENTIFIER NOT NULL,
    note_id     UNIQUEIDENTIFIER NOT NULL,
    PRIMARY KEY (group_id, note_id),
    CONSTRAINT fk_kgn_group FOREIGN KEY (group_id) REFERENCES knowledge_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_kgn_note  FOREIGN KEY (note_id)  REFERENCES notes(id)
);

-- System prompts
CREATE TABLE system_prompts (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    prompt_key      NVARCHAR(100)    NOT NULL UNIQUE,
    prompt_text     NVARCHAR(MAX)    NOT NULL,
    description     NVARCHAR(255),
    is_active       BIT              NOT NULL DEFAULT 1,
    updated_by      UNIQUEIDENTIFIER,
    created_at      DATETIME2(6)     NOT NULL DEFAULT SYSDATETIME(),
    updated_at      DATETIME2(6)
);

-- Notifications
CREATE TABLE notifications (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id         UNIQUEIDENTIFIER,
    title           NVARCHAR(255)    NOT NULL,
    message         NVARCHAR(MAX)    NOT NULL,
    is_broadcast    BIT              NOT NULL DEFAULT 0,
    is_read         BIT              NOT NULL DEFAULT 0,
    created_by      UNIQUEIDENTIFIER,
    created_at      DATETIME2(6)     NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Activity logs
CREATE TABLE activity_logs (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    user_id         UNIQUEIDENTIFIER,
    action          NVARCHAR(100)    NOT NULL,
    entity_type     NVARCHAR(50),
    entity_id       UNIQUEIDENTIFIER,
    detail          NVARCHAR(MAX),
    ip_address      NVARCHAR(45),
    created_at      DATETIME2(6)     NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT fk_al_user FOREIGN KEY (user_id) REFERENCES users(id)
);
