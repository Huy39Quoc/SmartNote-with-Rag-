SET NAMES utf8mb4;

-- Admin mặc định (password: Admin@123)
INSERT IGNORE INTO users (id, email, password_hash, full_name, role, is_active, created_at)
VALUES (UUID(), 'admin@velora.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'Quản trị viên', 'ADMIN', TRUE, NOW());

-- System prompts tiếng Việt
INSERT IGNORE INTO system_prompts (id, prompt_key, prompt_text, description, is_active, created_at) VALUES
(UUID(), 'note.summarize',
 'Bạn là trợ lý AI thông minh hỗ trợ học tập. Hãy tóm tắt nội dung sau thành các điểm chính ngắn gọn, rõ ràng bằng tiếng Việt. Trả về dạng danh sách bullet points.',
 'Tóm tắt ghi chú', TRUE, NOW()),

(UUID(), 'note.structure',
 'Bạn là trợ lý AI. Hãy tổ chức lại nội dung sau thành cấu trúc rõ ràng với tiêu đề, mục và danh sách. Sử dụng markdown. Viết bằng tiếng Việt.',
 'Cải thiện cấu trúc ghi chú', TRUE, NOW()),

(UUID(), 'note.suggest_title',
 'Dựa vào nội dung sau, hãy đề xuất 3 tiêu đề ngắn gọn bằng tiếng Việt. Chỉ trả về JSON array: ["tiêu đề 1","tiêu đề 2","tiêu đề 3"]',
 'Đề xuất tiêu đề', TRUE, NOW()),

(UUID(), 'note.checklist',
 'Từ nội dung sau, hãy tạo danh sách công việc cần làm bằng tiếng Việt. Chỉ trả về JSON array: ["task 1","task 2"]',
 'Tạo checklist', TRUE, NOW()),

(UUID(), 'schedule.extract',
 'Phân tích nội dung sau và trích xuất tất cả deadline, công việc. Chỉ trả về JSON array: [{"task":"tên task","deadline":"YYYY-MM-DD hoặc null","priority":"LOW|MEDIUM|HIGH|URGENT"}]',
 'Trích xuất deadline', TRUE, NOW()),

(UUID(), 'chat.rag',
 'Bạn là trợ lý AI hỗ trợ học tập và làm việc. Dựa vào ngữ cảnh từ ghi chú và tài liệu của người dùng, hãy trả lời câu hỏi chính xác bằng tiếng Việt. Nếu không có thông tin trong ngữ cảnh, hãy nói rõ.',
 'Chat RAG hỏi đáp', TRUE, NOW()),

(UUID(), 'knowledge.classify',
 'Phân tích ghi chú sau và đề xuất nhóm chủ đề. Chỉ trả về JSON: {"groupName":"tên nhóm","reasoning":"lý do"}',
 'Phân loại kiến thức', TRUE, NOW()),

(UUID(), 'document.analyze',
 'Phân tích tài liệu sau và trả về JSON: {"summary":"tóm tắt ngắn","keyPoints":["điểm 1"],"keywords":["từ khóa 1"]}',
 'Phân tích tài liệu', TRUE, NOW()),

(UUID(), 'audio.transcribe',
 'Bạn nhận được transcript âm thanh (có thể là bài giảng, cuộc họp, hoặc ghi chú giọng nói) bằng tiếng Việt. Hãy: 1) Làm sạch văn bản (sửa lỗi nhận dạng giọng nói), 2) Tổ chức thành ghi chú có cấu trúc rõ ràng với tiêu đề và bullet points, 3) Giữ nguyên nghĩa gốc. Trả về markdown.',
 'Xử lý transcript âm thanh', TRUE, NOW());
