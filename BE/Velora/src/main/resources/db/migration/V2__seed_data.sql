INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at)
VALUES (
    NEWID(),
    'admin@velora.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    N'Quản trị viên',
    'ADMIN',
    1,
    SYSDATETIME()
);

INSERT INTO system_prompts (id, prompt_key, prompt_text, description, is_active, created_at) VALUES
(NEWID(), 'note.summarize',
 N'Bạn là trợ lý AI thông minh hỗ trợ học tập. Hãy tóm tắt nội dung sau thành các điểm chính ngắn gọn, rõ ràng bằng tiếng Việt. Trả về dạng danh sách bullet points.',
 N'Tóm tắt ghi chú', 1, SYSDATETIME()),

(NEWID(), 'note.structure',
 N'Bạn là trợ lý AI. Hãy tổ chức lại nội dung sau thành cấu trúc rõ ràng với tiêu đề, mục và danh sách. Sử dụng markdown. Viết bằng tiếng Việt.',
 N'Cải thiện cấu trúc ghi chú', 1, SYSDATETIME()),

(NEWID(), 'note.suggest_title',
 N'Dựa vào nội dung sau, hãy đề xuất 3 tiêu đề ngắn gọn bằng tiếng Việt. Chỉ trả về JSON array: ["tiêu đề 1","tiêu đề 2","tiêu đề 3"]',
 N'Đề xuất tiêu đề', 1, SYSDATETIME()),

(NEWID(), 'note.checklist',
 N'Từ nội dung sau, hãy tạo danh sách công việc cần làm bằng tiếng Việt. Chỉ trả về JSON array: ["task 1","task 2"]',
 N'Tạo checklist', 1, SYSDATETIME()),

(NEWID(), 'schedule.extract',
 N'Phân tích nội dung sau và trích xuất tất cả deadline, công việc. Chỉ trả về JSON array: [{"task":"tên task","deadline":"YYYY-MM-DD hoặc null","priority":"LOW|MEDIUM|HIGH|URGENT"}]',
 N'Trích xuất deadline', 1, SYSDATETIME()),

(NEWID(), 'chat.rag',
 N'Bạn là trợ lý AI hỗ trợ học tập và làm việc. Dựa vào ngữ cảnh từ ghi chú và tài liệu của người dùng, hãy trả lời câu hỏi chính xác bằng tiếng Việt. Nếu không có thông tin trong ngữ cảnh, hãy nói rõ.',
 N'Chat RAG hỏi đáp', 1, SYSDATETIME()),

(NEWID(), 'knowledge.classify',
 N'Phân tích ghi chú sau và đề xuất nhóm chủ đề. Chỉ trả về JSON: {"groupName":"tên nhóm","reasoning":"lý do"}',
 N'Phân loại kiến thức', 1, SYSDATETIME()),

(NEWID(), 'document.analyze',
 N'Phân tích tài liệu sau và trả về JSON: {"summary":"tóm tắt ngắn","keyPoints":["điểm 1"],"keywords":["từ khóa 1"]}',
 N'Phân tích tài liệu', 1, SYSDATETIME()),

(NEWID(), 'audio.transcribe',
 N'Bạn nhận được transcript âm thanh bằng tiếng Việt. Hãy: 1) Làm sạch văn bản, 2) Tổ chức thành ghi chú có cấu trúc với tiêu đề và bullet points, 3) Giữ nguyên nghĩa gốc. Trả về markdown.',
 N'Xử lý transcript âm thanh', 1, SYSDATETIME());

IF NOT EXISTS (SELECT 1 FROM package_service WHERE name = 'FREE')
BEGIN
    INSERT INTO package_service (
        id, name, price_monthly, price_yearly, description, max_notes,
        max_ai_formats_per_month, storage_gb, max_devices, features, is_active
    )
    VALUES (
        '11111111-1111-1111-1111-111111111111',
        'FREE',
        0,
        0,
        N'Goi mien phi danh cho nguoi dung moi.',
        50,
        10,
        1,
        1,
        'TAG_SUBJECT,CHECKLIST_BASIC,AI_NOTE_FORMAT,AI_SUMMARY_BASIC,AI_CHAT,DOCUMENT_UPLOAD',
        1
    );
END;

IF NOT EXISTS (SELECT 1 FROM package_service WHERE name = 'PRO')
BEGIN
    INSERT INTO package_service (
        id, name, price_monthly, price_yearly, description, max_notes,
        max_ai_formats_per_month, storage_gb, max_devices, features, is_active
    )
    VALUES (
        '22222222-2222-2222-2222-222222222222',
        'PRO',
        49000,
        390000,
        N'Goi Pro mo khoa ghi chu khong gioi han va AI nang cao.',
        -1,
        -1,
        2,
        3,
        'TAG_SUBJECT,CHECKLIST_BASIC,AI_NOTE_FORMAT,AI_SUMMARY_BASIC,AI_SUMMARY_ADVANCED,AI_CHAT,AI_ANALYZE,DOCUMENT_UPLOAD,EXTRACT_SCHEDULE,DEADLINE_MANAGEMENT,PRIORITY_SUGGESTION,AI_FLASHCARD,EXPORT_FILE,AI_AUDIO',
        1
    );
END;

IF NOT EXISTS (SELECT 1 FROM package_service WHERE name = 'PLUS')
BEGIN
    INSERT INTO package_service (
        id, name, price_monthly, price_yearly, description, max_notes,
        max_ai_formats_per_month, storage_gb, max_devices, features, is_active
    )
    VALUES (
        '33333333-3333-3333-3333-333333333333',
        'PLUS',
        99000,
        790000,
        N'Goi Plus danh cho nguoi dung nang va hoc nhom.',
        -1,
        -1,
        10,
        -1,
        'TAG_SUBJECT,CHECKLIST_BASIC,AI_NOTE_FORMAT,AI_SUMMARY_BASIC,AI_SUMMARY_ADVANCED,AI_CHAT,AI_ANALYZE,DOCUMENT_UPLOAD,EXTRACT_SCHEDULE,DEADLINE_MANAGEMENT,PRIORITY_SUGGESTION,AI_FLASHCARD,EXPORT_FILE,AI_AUDIO,TEAM_WORK,SHARE_DOCUMENT,AI_PROGRESS_ANALYTICS,PRIORITY_SUPPORT',
        1
    );
END;

DECLARE @plusPackageId UNIQUEIDENTIFIER;
DECLARE @thanhUserId UNIQUEIDENTIFIER;

SELECT @plusPackageId = id
FROM package_service
WHERE name = 'PLUS';

SELECT @thanhUserId = id
FROM users
WHERE email = 'thanh@gmail.com';

IF @thanhUserId IS NULL
BEGIN
    SET @thanhUserId = NEWID();

    INSERT INTO users (
        id, email, password_hash, full_name, role, is_active, created_at, updated_at,
        package_id, package_expiry_date, ai_used_this_month, last_ai_usage_date
    )
    VALUES (
        @thanhUserId,
        'thanh@gmail.com',
        '$2a$10$7959IAS7Ta/ob38TYlgy2.qcZf6RvxBuLZ4zl3CsajcYSYaMoSWgW',
        N'Thanh',
        'USER',
        1,
        SYSDATETIME(),
        SYSDATETIME(),
        @plusPackageId,
        DATEADD(MONTH, 1, SYSDATETIME()),
        0,
        NULL
    );
END
ELSE
BEGIN
    UPDATE users
    SET password_hash = '$2a$10$7959IAS7Ta/ob38TYlgy2.qcZf6RvxBuLZ4zl3CsajcYSYaMoSWgW',
        full_name = COALESCE(NULLIF(full_name, ''), N'Thanh'),
        role = 'USER',
        is_active = 1,
        updated_at = SYSDATETIME(),
        package_id = @plusPackageId,
        package_expiry_date = CASE
            WHEN package_expiry_date IS NULL OR package_expiry_date < SYSDATETIME()
            THEN DATEADD(MONTH, 1, SYSDATETIME())
            ELSE package_expiry_date
        END,
        ai_used_this_month = COALESCE(ai_used_this_month, 0)
    WHERE id = @thanhUserId;
END;

IF NOT EXISTS (SELECT 1 FROM package_transactions WHERE txn_ref = 'SEED_THANH_PLUS')
BEGIN
    INSERT INTO package_transactions (
        id, txn_ref, user_id, package_id, amount, status, vnpay_tran_no, created_at
    )
    VALUES (
        NEWID(),
        'SEED_THANH_PLUS',
        @thanhUserId,
        @plusPackageId,
        99000,
        'SUCCESS',
        NULL,
        SYSDATETIME()
    );
END;
