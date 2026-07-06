CREATE TABLE note_versions (
    id              UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    note_id         UNIQUEIDENTIFIER NOT NULL,
    edited_by       UNIQUEIDENTIFIER,
    version_number  INT              NOT NULL,
    title           NVARCHAR(255)    NOT NULL,
    content         NVARCHAR(MAX),
    created_at      DATETIME2(6)     NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT fk_nv_note FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    CONSTRAINT fk_nv_user FOREIGN KEY (edited_by) REFERENCES users(id),
    CONSTRAINT uq_note_version UNIQUE (note_id, version_number)
);

CREATE INDEX idx_note_versions_note_created
    ON note_versions(note_id, created_at DESC);
