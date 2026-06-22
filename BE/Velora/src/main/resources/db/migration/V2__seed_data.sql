-- ============================================================
-- Velora - Seed data (SQL Server)
-- Admin mặc định: admin@velora.com / Admin@123
-- ============================================================

-- Admin account (BCrypt của "Admin@123")
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

-- System prompts tiếng Việt
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

INSERT INTO package_service (id, name, price, storage_gb, max_notes, max_devices, max_ai_formats_per_month, features, created_at)
VALUES ('free-package-uuid-1111-2222', 'FREE', 0, 1, 10, 2, 5, 'AI_CHAT,AI_SUMMARY,AI_TRANSLATE,EXTRACT_SCHEDULE', NOW());
