package org.example.velora.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.velora.exception.BadRequestException;
import org.example.velora.util.LmStudioClient;
import org.example.velora.util.ChromaDbClient;
import org.example.velora.util.RichTextContent;
import org.example.velora.dto.request.NoteRequest;
import org.example.velora.dto.response.*;
import org.example.velora.entity.Flashcard;
import org.example.velora.entity.Note;
import org.example.velora.entity.Schedule;
import org.example.velora.entity.SystemPrompt;
import org.example.velora.repository.SystemPromptRepository;
import org.example.velora.service.AiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.io.File;
import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AiServiceImpl implements AiService {

    private final LmStudioClient lmStudioClient;
    private final ChromaDbClient chromaDbClient;
    private final SystemPromptRepository systemPromptRepository;
    private final ObjectMapper objectMapper;

    @Override
    public NoteResponse.AiResult improveNote(String content, String title,
                                             NoteRequest.AiImprove.AiAction action) {
        NoteResponse.AiResult.AiResultBuilder b = NoteResponse.AiResult.builder().action(action.name());
        try {
            switch (action) {
                case SUMMARIZE -> b.summary(lmStudioClient.complete(
                        getPrompt("note.summarize") + "\n\n" + content));
                case STRUCTURE -> b.improvedContent(lmStudioClient.complete(
                        getPrompt("note.structure") + "\n\n" + content));
                case SUGGEST_TITLE -> {
                    String raw = lmStudioClient.complete(getPrompt("note.suggest_title") + "\n\n" + content);
                    List<String> titles = parseJsonArray(raw);
                    b.suggestedTitle(titles.isEmpty() ? "Ghi chú mới" : titles.get(0)).keyPoints(titles);
                }
                case CREATE_CHECKLIST -> b.checklist(parseJsonArray(
                        lmStudioClient.complete(getPrompt("note.checklist") + "\n\n" + content)));
                case IMPROVE_ALL -> b
                        .summary(lmStudioClient.complete(getPrompt("note.summarize") + "\n\n" + content))
                        .improvedContent(lmStudioClient.complete(getPrompt("note.structure") + "\n\n" + content));
            }
        } catch (Exception e) {
            log.error("improveNote error: {}", e.getMessage());
            b.summary("Không thể xử lý AI lúc này");
        }
        return b.build();
    }

    @Override
    public DocumentResponse.AnalysisResult analyzeDocument(String text, String instruction) {
        String truncated = text.length() > 8000 ? text.substring(0, 8000) + "..." : text;
        String prompt = getPrompt("document.analyze");
        if (StringUtils.hasText(instruction)) {
            prompt = instruction + "\n\n" + prompt;
        }
        try {
            String raw = lmStudioClient.complete(prompt + "\n\n" + truncated);

            // Sửa đổi: Sử dụng TypeReference để định nghĩa chính xác kiểu dữ liệu Map<String, Object>
            Map<String, Object> parsed = objectMapper.readValue(
                    cleanJson(raw, '{'),
                    new TypeReference<Map<String, Object>>() {
                    }
            );

            @SuppressWarnings("unchecked")
            List<String> keyPoints = (List<String>) parsed.getOrDefault("keyPoints", List.of());
            @SuppressWarnings("unchecked")
            List<String> keywords = (List<String>) parsed.getOrDefault("keywords", List.of());

            return DocumentResponse.AnalysisResult.builder()
                    .summary((String) parsed.get("summary"))
                    .keyPoints(keyPoints)
                    .keywords(keywords)
                    .build();
        } catch (Exception e) {
            log.error("analyzeDocument error: {}", e.getMessage());
            return DocumentResponse.AnalysisResult.builder()
                    .summary("Không thể phân tích tài liệu lúc này").build();
        }
    }

    @Override
    public String chatWithContext(String question, List<String> contextChunks) {
        if (contextChunks == null || contextChunks.isEmpty()) {
            return "Mình chưa tìm thấy nội dung liên quan trong tài liệu đã upload.";
        }

        List<String> limitedChunks = contextChunks.stream()
                .filter(Objects::nonNull)
                .filter(s -> !s.isBlank())
                .limit(5)
                .toList();

        StringBuilder contextBuilder = new StringBuilder();

        for (int i = 0; i < limitedChunks.size(); i++) {
            contextBuilder
                    .append("[Nguồn ")
                    .append(i + 1)
                    .append("]\n")
                    .append(limitedChunks.get(i))
                    .append("\n\n");
        }

        String context = contextBuilder.toString();

        String systemPrompt = """
                Bạn là trợ lý học tập RAG của ứng dụng Velora.
                
                Quy tắc bắt buộc:
                - Chỉ trả lời dựa trên NGỮ CẢNH được cung cấp.
                - Nếu ngữ cảnh không đủ thông tin, hãy nói rõ: "Tài liệu chưa có đủ thông tin để trả lời chính xác."
                - Không bịa thêm kiến thức ngoài tài liệu.
                - Trả lời bằng tiếng Việt.
                - Ưu tiên trả lời rõ ràng, có gạch đầu dòng nếu phù hợp.
                - Khi có thể, hãy nhắc nguồn theo dạng [Nguồn 1], [Nguồn 2].
                - Không dùng markdown quá phức tạp.
                """;

        String userMsg = """
                NGỮ CẢNH TỪ TÀI LIỆU:
                %s
                
                CÂU HỎI:
                %s
                
                Hãy trả lời dựa trên ngữ cảnh trên.
                """.formatted(context, question);

        String answer = lmStudioClient.chatComplete(systemPrompt, userMsg);

        if (answer == null || answer.isBlank()
                || answer.contains("Không thể kết nối AI")
                || answer.contains("AI chưa trả về nội dung")) {
            return "Mình đã tìm thấy nội dung liên quan trong tài liệu, nhưng model AI trả lời chưa ổn. "
                    + "Bạn có thể xem các đoạn liên quan dưới đây:\n\n" + context;
        }

        return answer;
    }

    @Override
    public ScheduleResponse.ExtractResult extractSchedules(String content) {
        try {
            String prompt = """
                    Bạn là công cụ trích xuất lịch/deadline từ ghi chú tiếng Việt.
                    
                    Nhiệm vụ:
                    - Chỉ trả về JSON array hợp lệ.
                    - Không giải thích.
                    - Không markdown.
                    - Không thêm chữ ngoài JSON.
                    - Nếu không tìm thấy lịch/deadline, trả về [].
                    
                    Format bắt buộc:
                    [
                      {
                        "task": "Tên công việc",
                        "deadline": "yyyy-MM-dd",
                        "priority": "LOW|MEDIUM|HIGH|URGENT"
                      }
                    ]
                    
                    Quy tắc:
                    - Câu có từ: deadline, hạn nộp, nộp bài, kiểm tra, thi, thuyết trình, họp, lịch, học, hẹn
                      thì được xem là công việc/lịch.
                    - Nếu thấy ngày dạng dd/MM/yyyy thì đổi sang yyyy-MM-dd.
                    - Nếu chỉ có ngày/tháng mà không có năm thì dùng năm hiện tại.
                    - priority mặc định là MEDIUM.
                    - Nếu có "hạn nộp", "deadline", "thi", "kiểm tra" thì priority là HIGH.
                    - Nếu có "gấp", "khẩn", "hôm nay", "quá hạn" thì priority là URGENT.
                    
                    Nội dung ghi chú:
                    """ + "\n" + content;

            String raw = lmStudioClient.complete(prompt);

            List<ScheduleResponse.Item> extracted = parseScheduleItems(raw, content);

            return ScheduleResponse.ExtractResult.builder()
                    .extracted(extracted)
                    .totalFound(extracted.size())
                    .rawAiResponse(raw)
                    .build();

        } catch (Exception e) {
            log.error("extractSchedules error: {}", e.getMessage());

            List<ScheduleResponse.Item> fallback = fallbackExtractSchedules(content);

            return ScheduleResponse.ExtractResult.builder()
                    .extracted(fallback)
                    .totalFound(fallback.size())
                    .rawAiResponse("Fallback regex used because AI response was not valid JSON")
                    .build();
        }
    }

    private List<ScheduleResponse.Item> parseScheduleItems(String raw, String originalContent) {
        try {
            String json = extractJsonArray(raw);

            List<Map<String, Object>> items = objectMapper.readValue(
                    json,
                    new TypeReference<List<Map<String, Object>>>() {
                    }
            );

            List<ScheduleResponse.Item> extracted = new ArrayList<>();

            for (Map<String, Object> m : items) {
                if (m == null) {
                    continue;
                }

                String taskName = asText(m.get("task"));
                if (!StringUtils.hasText(taskName)) {
                    taskName = asText(m.get("taskName"));
                }

                String deadlineStr = asText(m.get("deadline"));
                LocalDate deadline = parseFlexibleDate(deadlineStr);

                if (!StringUtils.hasText(taskName) && deadline != null) {
                    taskName = buildTaskNameAroundDate(originalContent, deadlineStr);
                }

                if (!StringUtils.hasText(taskName)) {
                    continue;
                }

                Schedule.Priority priority = parsePriority(asText(m.get("priority")), taskName);

                extracted.add(ScheduleResponse.Item.builder()
                        .taskName(taskName)
                        .deadline(deadline)
                        .priority(priority)
                        .build());
            }

            if (!extracted.isEmpty()) {
                return extracted;
            }

            return fallbackExtractSchedules(originalContent);

        } catch (Exception e) {
            log.warn("AI schedule JSON invalid, using regex fallback. raw={}", raw);
            return fallbackExtractSchedules(originalContent);
        }
    }

    private String extractJsonArray(String raw) {
        if (raw == null || raw.isBlank()) {
            return "[]";
        }

        String cleaned = raw.trim();

        if (cleaned.startsWith("```")) {
            cleaned = cleaned
                    .replace("```json", "")
                    .replace("```", "")
                    .trim();
        }

        int start = cleaned.indexOf('[');
        int end = cleaned.lastIndexOf(']');

        if (start >= 0 && end > start) {
            return cleaned.substring(start, end + 1);
        }

        return "[]";
    }

    private List<ScheduleResponse.Item> fallbackExtractSchedules(String content) {
        if (!StringUtils.hasText(content)) {
            return List.of();
        }

        List<ScheduleResponse.Item> result = new ArrayList<>();

        Pattern datePattern = Pattern.compile(
                "\\b(\\d{1,2})[/-](\\d{1,2})(?:[/-](\\d{2,4}))?\\b"
        );

        Matcher matcher = datePattern.matcher(content);

        while (matcher.find()) {
            int day = Integer.parseInt(matcher.group(1));
            int month = Integer.parseInt(matcher.group(2));

            int year;
            if (matcher.group(3) != null) {
                year = Integer.parseInt(matcher.group(3));
                if (year < 100) {
                    year += 2000;
                }
            } else {
                year = LocalDate.now().getYear();
            }

            LocalDate deadline;
            try {
                deadline = LocalDate.of(year, month, day);
            } catch (Exception e) {
                continue;
            }

            String matchedDate = matcher.group(0);
            String taskName = buildTaskNameAroundDate(content, matchedDate);

            if (!StringUtils.hasText(taskName)) {
                taskName = "Công việc ngày " + matchedDate;
            }

            Schedule.Priority priority = parsePriority(null, taskName + " " + content);

            result.add(ScheduleResponse.Item.builder()
                    .taskName(taskName)
                    .deadline(deadline)
                    .priority(priority)
                    .build());
        }

        return result;
    }

    private String buildTaskNameAroundDate(String content, String dateText) {
        if (!StringUtils.hasText(content)) {
            return "Công việc";
        }

        String[] sentences = content.split("[.!?\\n]+");

        for (String sentence : sentences) {
            if (dateText != null && sentence.contains(dateText)) {
                return cleanupTaskName(sentence);
            }
        }

        for (String sentence : sentences) {
            String lower = sentence.toLowerCase();
            if (lower.contains("deadline")
                    || lower.contains("hạn")
                    || lower.contains("nộp")
                    || lower.contains("thi")
                    || lower.contains("kiểm tra")
                    || lower.contains("thuyết trình")
                    || lower.contains("họp")
                    || lower.contains("học")) {
                return cleanupTaskName(sentence);
            }
        }

        return cleanupTaskName(content);
    }

    private String cleanupTaskName(String text) {
        if (text == null) {
            return "Công việc";
        }

        String cleaned = text.trim();

        cleaned = cleaned.replaceAll("(?i)\\bngày\\b", "");
        cleaned = cleaned.replaceAll("\\b\\d{1,2}[/-]\\d{1,2}([/-]\\d{2,4})?\\b", "");
        cleaned = cleaned.replaceAll("\\s+", " ").trim();

        if (cleaned.length() > 180) {
            cleaned = cleaned.substring(0, 180).trim();
        }

        return StringUtils.hasText(cleaned) ? cleaned : "Công việc";
    }

    private LocalDate parseFlexibleDate(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }

        String v = value.trim();

        try {
            return LocalDate.parse(v);
        } catch (Exception ignored) {
        }

        Matcher m = Pattern.compile("\\b(\\d{1,2})[/-](\\d{1,2})(?:[/-](\\d{2,4}))?\\b")
                .matcher(v);

        if (!m.find()) {
            return null;
        }

        int day = Integer.parseInt(m.group(1));
        int month = Integer.parseInt(m.group(2));

        int year;
        if (m.group(3) != null) {
            year = Integer.parseInt(m.group(3));
            if (year < 100) {
                year += 2000;
            }
        } else {
            year = LocalDate.now().getYear();
        }

        try {
            return LocalDate.of(year, month, day);
        } catch (Exception e) {
            return null;
        }
    }

    private Schedule.Priority parsePriority(String raw, String text) {
        if (StringUtils.hasText(raw)) {
            try {
                return Schedule.Priority.valueOf(raw.trim().toUpperCase());
            } catch (Exception ignored) {
            }
        }

        String lower = text == null ? "" : text.toLowerCase();

        if (lower.contains("gấp")
                || lower.contains("khẩn")
                || lower.contains("hôm nay")
                || lower.contains("quá hạn")) {
            return Schedule.Priority.URGENT;
        }

        if (lower.contains("deadline")
                || lower.contains("hạn")
                || lower.contains("nộp")
                || lower.contains("thi")
                || lower.contains("kiểm tra")) {
            return Schedule.Priority.HIGH;
        }

        return Schedule.Priority.MEDIUM;
    }

    private String asText(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    @Override
    public KnowledgeGroupResponse.ClassifyResult classifyContent(String content) {
        try {
            String safeContent = content == null ? "" : content.trim();

            if (!StringUtils.hasText(safeContent)) {
                return fallbackClassifyContent("");
            }

            String truncated = safeContent.length() > 4000
                    ? safeContent.substring(0, 4000)
                    : safeContent;

            String prompt = """
                    Bạn là công cụ phân loại ghi chú học tập.
                    
                    Nhiệm vụ:
                    - Chỉ trả về JSON object hợp lệ.
                    - Không markdown.
                    - Không giải thích ngoài JSON.
                    - Không thêm chữ trước hoặc sau JSON.
                    
                    Format bắt buộc:
                    {
                      "groupName": "Tên nhóm kiến thức ngắn gọn",
                      "reasoning": "Lý do phân loại ngắn gọn"
                    }
                    
                    Gợi ý nhóm:
                    - Lập trình Java
                    - Cơ sở dữ liệu
                    - Trí tuệ nhân tạo
                    - Lịch học & Deadline
                    - Toán học
                    - Khởi nghiệp
                    - Tiếng Anh
                    - Chung
                    
                    Nội dung ghi chú:
                    """ + "\n" + truncated;

            String raw = lmStudioClient.complete(prompt);

            Map<String, Object> parsed = objectMapper.readValue(
                    extractJsonObject(raw),
                    new TypeReference<Map<String, Object>>() {
                    }
            );

            String groupName = asText(parsed.get("groupName"));
            String reasoning = asText(parsed.get("reasoning"));

            if (!StringUtils.hasText(groupName)) {
                return fallbackClassifyContent(content);
            }

            return KnowledgeGroupResponse.ClassifyResult.builder()
                    .suggestedGroupName(groupName.trim())
                    .reasoning(StringUtils.hasText(reasoning) ? reasoning.trim() : "AI phân loại theo nội dung ghi chú.")
                    .build();

        } catch (Exception e) {
            log.warn("classifyContent AI JSON invalid, using keyword fallback: {}", e.getMessage());
            return fallbackClassifyContent(content);
        }
    }

    private String extractJsonObject(String raw) {
        if (raw == null || raw.isBlank()) {
            return "{}";
        }

        String cleaned = raw.trim();

        if (cleaned.startsWith("```")) {
            cleaned = cleaned
                    .replace("```json", "")
                    .replace("```", "")
                    .trim();
        }

        int start = cleaned.indexOf('{');
        int end = cleaned.lastIndexOf('}');

        if (start >= 0 && end > start) {
            return cleaned.substring(start, end + 1);
        }

        return "{}";
    }

    private KnowledgeGroupResponse.ClassifyResult fallbackClassifyContent(String content) {
        String text = content == null ? "" : content.toLowerCase();

        String groupName;
        String reasoning;

        if (containsAny(text,
                "java", "oop", "class", "object", "interface", "abstract",
                "spring", "spring boot", "jpa", "hibernate")) {

            groupName = "Lập trình Java";
            reasoning = "Nội dung có các từ khóa liên quan đến Java/OOP hoặc Spring Boot.";

        } else if (containsAny(text,
                "sql", "database", "cơ sở dữ liệu", "csdl", "table",
                "query", "join", "primary key", "foreign key", "entity")) {

            groupName = "Cơ sở dữ liệu";
            reasoning = "Nội dung có các từ khóa liên quan đến database hoặc SQL.";

        } else if (containsAny(text,
                "ai", "rag", "llm", "embedding", "vector", "chromadb",
                "machine learning", "deep learning", "model", "prompt")) {

            groupName = "Trí tuệ nhân tạo";
            reasoning = "Nội dung có các từ khóa liên quan đến AI, RAG hoặc mô hình ngôn ngữ.";

        } else if (containsAny(text,
                "deadline", "lịch", "học", "nộp bài", "bài tập",
                "thi", "kiểm tra", "thuyết trình", "assignment")) {

            groupName = "Lịch học & Deadline";
            reasoning = "Nội dung có thông tin về lịch học, deadline hoặc bài tập.";

        } else if (containsAny(text,
                "toán", "phân số", "số học", "đại số", "hình học",
                "cộng", "trừ", "nhân", "chia")) {

            groupName = "Toán học";
            reasoning = "Nội dung có các từ khóa liên quan đến toán học.";

        } else if (containsAny(text,
                "startup", "khởi nghiệp", "kinh doanh", "doanh thu",
                "marketing", "khách hàng", "sản phẩm", "thị trường")) {

            groupName = "Khởi nghiệp";
            reasoning = "Nội dung có các từ khóa liên quan đến kinh doanh hoặc khởi nghiệp.";

        } else if (containsAny(text,
                "ielts", "english", "speaking", "writing", "reading",
                "listening", "vocabulary", "grammar")) {

            groupName = "Tiếng Anh";
            reasoning = "Nội dung có các từ khóa liên quan đến học tiếng Anh.";

        } else {
            groupName = "Chung";
            reasoning = "Không tìm thấy nhóm chuyên biệt rõ ràng nên đưa vào nhóm Chung.";
        }

        return KnowledgeGroupResponse.ClassifyResult.builder()
                .suggestedGroupName(groupName)
                .reasoning(reasoning)
                .build();
    }

    private boolean containsAny(String text, String... keywords) {
        if (text == null) {
            return false;
        }

        for (String keyword : keywords) {
            if (text.contains(keyword.toLowerCase())) {
                return true;
            }
        }

        return false;
    }

    /**
     * Transcribe audio file → text tiếng Việt. LM Studio hiện chưa hỗ trợ audio
     * trực tiếp qua /v1/audio/transcriptions nên dùng phương án: đọc file
     * binary → base64 → gửi kèm prompt mô tả. Trong production nên thay bằng
     * Whisper API hoặc faster-whisper local.
     */
    @Override
    public String transcribeAudioFile(String filePath) {
        try {
            String transcript = chromaDbClient.transcribeAudio(filePath, "vi");

            if (transcript == null || transcript.isBlank()) {
                throw new BadRequestException("AI không trả về transcript từ file âm thanh.");
            }

            if (transcript.contains("Cần cài Whisper")) {
                throw new BadRequestException("Whisper chưa hoạt động đúng trong AI service.");
            }

            return transcript;

        } catch (Exception e) {
            log.error("Audio transcription failed. filePath={}", filePath, e);
            throw new BadRequestException("Không thể nhận dạng âm thanh: " + e.getMessage());
        }
    }

    @Override
    public String structureTranscript(String rawTranscript, String topic) {
        String prompt = getPrompt("audio.transcribe");
        if (StringUtils.hasText(topic)) {
            prompt = "Chủ đề: " + topic + "\n\n" + prompt;
        }
        return lmStudioClient.complete(prompt + "\n\nTranscript:\n" + rawTranscript);
    }

    @Override
    public String suggestTitle(String content) {
        try {
            String raw = lmStudioClient.complete(getPrompt("note.suggest_title") + "\n\n" + content);
            List<String> titles = parseJsonArray(raw);
            return titles.isEmpty() ? "Ghi chú từ âm thanh" : titles.get(0);
        } catch (Exception e) {
            return "Ghi chú từ âm thanh";
        }
    }

    @Override
    public String getPrompt(String promptKey) {
        return systemPromptRepository.findByPromptKeyAndIsActiveTrue(promptKey)
                .map(SystemPrompt::getPromptText)
                .orElse("Hãy xử lý nội dung sau bằng tiếng Việt:");
    }

    @lombok.Data
    public static class AiFlashcardItem {

        private String question;
        private String answer;
    }

    @Override
    public List<Flashcard> generateFlashcardsFromNote(Note note) {

        String prompt = """
                Bạn là một trợ lý học tập chuyên nghiệp chuyên bóc tách kiến thức.
                Nhiệm vụ: Dựa trên nội dung ghi chú sau đây, hãy tạo ra các cặp câu hỏi và câu trả lời rút gọn (Flashcard) để phục vụ việc ôn thi.
                
                Yêu cầu bắt buộc:
                - Chỉ trả về DUY NHẤT một mảng JSON (JSON Array) hợp lệ.
                - Không kèm theo bất kỳ lời giải thích, tiêu đề, hoặc ký tự markdown định dạng nào bên ngoài.
                - Không bọc thẻ ```json ... ```.
                - Nếu ghi chú quá ngắn hoặc không có thông tin để tạo câu hỏi, hãy trả về mảng rỗng [].
                
                Cấu trúc JSON:
                [
                  {
                    "question": "Nội dung câu hỏi cốt lõi",
                    "answer": "Nội dung câu trả lời rút gọn"
                  }
                ]
                
                Nội dung ghi chú:
                """ + "\n" + RichTextContent.toPlainText(note.getContent());

        String aiRawJson = lmStudioClient.complete(prompt);

        List<Flashcard> savedCards = new ArrayList<>();

        try {

            String cleanJson = extractJsonArray(aiRawJson);

            AiFlashcardItem[] items
                    = objectMapper.readValue(
                    cleanJson,
                    AiFlashcardItem[].class
            );

            for (AiFlashcardItem item : items) {

                if (item == null
                        || !org.springframework.util.StringUtils.hasText(item.getQuestion())) {
                    continue;
                }

                Flashcard card = Flashcard.builder()
                        .question(item.getQuestion().trim())
                        .answer(item.getAnswer() != null
                                ? item.getAnswer().trim()
                                : "")
                        .note(note)
                        .user(note.getUser())
                        .build();

                savedCards.add(card);
            }

        } catch (Exception e) {

            log.error(
                    "Lỗi phân rã JSON Flashcard từ AI: {}. Nội dung gốc: {}",
                    e.getMessage(),
                    aiRawJson
            );

            throw new org.example.velora.exception.BadRequestException(
                    "Mô hình AI trả về cấu trúc dữ liệu không đúng định dạng mảng JSON. Hãy thử lại!"
            );
        }

        return savedCards;
    }

    @Override
    public String generateDiagramFromNote(
            String title,
            String content,
            NoteRequest.GenerateDiagram.DiagramType diagramType
    ) {
        String plainContent = RichTextContent.toPlainText(content);

        if (!StringUtils.hasText(plainContent)) {
            throw new BadRequestException("Ghi chú không có nội dung để tạo sơ đồ.");
        }

        if (diagramType == null) {
            throw new BadRequestException("Vui lòng chọn loại sơ đồ.");
        }

        String safeTitle = StringUtils.hasText(title) ? title.trim() : "Ghi chú";
        String truncated = plainContent.length() > 5000
                ? plainContent.substring(0, 5000)
                : plainContent;

        String prompt = buildDiagramPrompt(safeTitle, truncated, diagramType);

        try {
            String raw = lmStudioClient.complete(prompt);

            if (!StringUtils.hasText(raw)
                    || raw.contains("AI chưa trả về nội dung")
                    || raw.contains("Hãy kiểm tra LM Studio")) {
                return buildFallbackDiagram(safeTitle, truncated, diagramType);
            }

            return normalizeDiagramOutput(raw, safeTitle, truncated, diagramType);

        } catch (Exception e) {
            log.error("generateDiagramFromNote error: {}", e.getMessage(), e);
            return buildFallbackDiagram(safeTitle, truncated, diagramType);
        }
    }

    private List<String> parseJsonArray(String raw) {
        try {
            // Sửa đổi: Định hình rõ cấu trúc kiểu dữ liệu List<String> khi nhận mảng từ JSON
            return objectMapper.readValue(cleanJson(raw, '['), new TypeReference<List<String>>() {
            });
        } catch (Exception e) {
            return List.of(raw.trim());
        }
    }

    private String cleanJson(String raw, char startChar) {
        if (raw == null) {
            return startChar == '[' ? "[]" : "{}";
        }
        raw = raw.trim();
        int idx = raw.indexOf(startChar);
        return idx >= 0 ? raw.substring(idx) : raw;
    }

    private String buildDiagramPrompt(
            String title,
            String content,
            NoteRequest.GenerateDiagram.DiagramType diagramType
    ) {
        String common = """
                Bạn là công cụ tạo sơ đồ học tập.
                QUY TẮC BẮT BUỘC:
                - Chỉ trả về đúng nội dung sơ đồ.
                - Không giải thích.
                - Không viết thêm mở đầu hoặc kết luận.
                - Không dùng markdown fence như ```mermaid hoặc ```json.
                - Không copy nguyên ASCII art từ tài liệu.
                - Không dùng các ký tự vẽ khung như +-----+, | Actor |, =====.
                - Nội dung node phải ngắn gọn, dễ học, dễ nhìn.
                """;

        return switch (diagramType) {
            case MINDMAP -> """
                    %s
                    
                    Hãy tạo Mermaid mindmap từ ghi chú sau.
                    
                    BẮT BUỘC:
                    - Chỉ trả về code Mermaid.
                    - Dòng đầu tiên phải là: mindmap
                    - Không dùng ASCII art.
                    - Không dùng dấu |, +, = nhiều lần.
                    - Không dùng dấu ngoặc vuông trong nội dung node.
                    - Node gốc là tiêu đề ghi chú.
                    
                    Ví dụ đúng:
                    mindmap
                      root((Java OOP))
                        Class
                        Object
                        Interface
                    
                    Tiêu đề:
                    %s
                    
                    Nội dung:
                    %s
                    """.formatted(common, title, content);

            case FLOWCHART -> """
                    %s
                    
                    Hãy tạo Mermaid flowchart TD từ ghi chú sau.
                    
                    BẮT BUỘC:
                    - Chỉ trả về code Mermaid.
                    - Dòng đầu tiên phải là: flowchart TD
                    - Mỗi node phải dùng dạng A["Nội dung"].
                    - Không dùng dấu ngoặc tròn () trong label.
                    - Không dùng dấu hai chấm : trong label.
                    - Không dùng dấu chấm phẩy ;.
                    - Không dùng dấu |, +-----+, =====.
                    - Không dùng cú pháp A & B & C --> D.
                    - Nếu nhiều node cùng trỏ đến một node, hãy viết từng dòng riêng.
                    - Nếu nội dung là sequence/communication diagram, hãy chuyển thành các bước đơn giản.
                    
                    Ví dụ đúng:
                    flowchart TD
                      A["Đăng nhập"] --> B["Mở form nộp bài"]
                      B --> C["Hệ thống hiển thị form"]
                      C --> D["Người dùng gửi dữ liệu"]
                    
                    Tiêu đề:
                    %s
                    
                    Nội dung:
                    %s
                    """.formatted(common, title, content);

            case ARCHITECTURE -> """
                    %s
                    
                    Hãy tạo Mermaid flowchart LR từ ghi chú sau.
                    
                    BẮT BUỘC:
                    - Chỉ trả về code Mermaid.
                    - Dòng đầu tiên phải là: flowchart LR
                    - Mỗi node phải dùng dạng A["Nội dung"].
                    - Không dùng dấu ngoặc tròn () trong label.
                    - Không dùng dấu hai chấm : trong label.
                    - Không dùng dấu chấm phẩy ;.
                    - Không dùng dấu |, +-----+, =====.
                    - Không dùng cú pháp A & B & C --> D.
                    - Nếu nhiều node cùng trỏ đến một node, hãy viết từng dòng riêng.
                    - Nếu nội dung không phải kiến trúc hệ thống, hãy nhóm thành các khối kiến thức chính.
                    
                    Ví dụ đúng:
                    flowchart LR
                      A["Frontend React"] --> B["Spring Boot Backend"]
                      B --> C["SQL Server Database"]
                      B --> D["FastAPI AI Service"]
                    
                    Tiêu đề:
                    %s
                    
                    Nội dung:
                    %s
                    """.formatted(common, title, content);

            case SKETCHNOTE -> """
                    %s
                    
                    Hãy tạo Sketchnote JSON từ ghi chú sau.
                    
                    BẮT BUỘC:
                    - Chỉ trả về JSON object hợp lệ.
                    - Không giải thích.
                    - Không thêm chữ ngoài JSON.
                    - Không dùng ```json.
                    - Không copy ASCII art từ tài liệu.
                    
                    Format:
                    {
                      "title": "Tên sketchnote",
                      "blocks": [
                        {
                          "icon": "📘",
                          "heading": "Ý chính",
                          "content": "Nội dung ngắn gọn"
                        }
                      ]
                    }
                    
                    Yêu cầu:
                    - Có từ 4 đến 8 blocks.
                    - Mỗi content phải ngắn gọn.
                    - Icon là emoji phù hợp.
                    
                    Tiêu đề:
                    %s
                    
                    Nội dung:
                    %s
                    """.formatted(common, title, content);
        };
    }

    private String normalizeDiagramOutput(
            String raw,
            String title,
            String content,
            NoteRequest.GenerateDiagram.DiagramType diagramType
    ) {
        String cleaned = raw == null ? "" : raw.trim()
                .replace("```mermaid", "")
                .replace("```json", "")
                .replace("```", "")
                .replace("\r", "")
                .trim();

        return switch (diagramType) {
            case SKETCHNOTE -> normalizeSketchnote(cleaned, title, content);
            case MINDMAP -> normalizeMindmap(cleaned, title, content);
            case FLOWCHART -> normalizeFlowchart(cleaned, title, content, false);
            case ARCHITECTURE -> normalizeFlowchart(cleaned, title, content, true);
        };
    }

    private String normalizeSketchnote(String cleaned, String title, String content) {
        int start = cleaned.indexOf('{');
        int end = cleaned.lastIndexOf('}');

        if (start >= 0 && end > start) {
            String json = cleaned.substring(start, end + 1).trim();

            try {
                objectMapper.readTree(json);
                return json;
            } catch (Exception ignored) {
            }
        }

        return buildFallbackSketchnote(title, content);
    }

    private String normalizeMindmap(String cleaned, String title, String content) {
        int index = cleaned.indexOf("mindmap");

        if (index >= 0) {
            String mermaid = cleaned.substring(index).trim();
            String sanitized = sanitizeMindmapMermaid(mermaid, title);

            if (StringUtils.hasText(sanitized)) {
                return sanitized;
            }
        }

        return buildFallbackMindmap(title, content);
    }

    private String normalizeFlowchart(
            String cleaned,
            String title,
            String content,
            boolean architecture
    ) {
        int indexTd = cleaned.indexOf("flowchart TD");
        int indexLr = cleaned.indexOf("flowchart LR");
        int index = -1;

        if (indexTd >= 0 && indexLr >= 0) {
            index = Math.min(indexTd, indexLr);
        } else if (indexTd >= 0) {
            index = indexTd;
        } else if (indexLr >= 0) {
            index = indexLr;
        } else {
            int generic = cleaned.indexOf("flowchart");
            if (generic >= 0) {
                index = generic;
            }
        }

        if (index >= 0) {
            String mermaid = cleaned.substring(index).trim();
            String sanitized = sanitizeFlowchartMermaid(mermaid, architecture);

            if (StringUtils.hasText(sanitized)) {
                return sanitized;
            }
        }

        return architecture
                ? buildFallbackArchitecture(title, content)
                : buildFallbackFlowchart(title, content);
    }

    private String sanitizeFlowchartMermaid(String mermaid, boolean architecture) {
        if (!StringUtils.hasText(mermaid)) {
            return "";
        }

        String[] rawLines = mermaid
                .replace("```mermaid", "")
                .replace("```", "")
                .replace("\r", "")
                .replace(";", "")
                .split("\n");

        List<String> result = new ArrayList<>();
        boolean hasHeader = false;

        for (String rawLine : rawLines) {
            String line = rawLine.trim();

            if (!StringUtils.hasText(line)) {
                continue;
            }

            if (line.startsWith("flowchart")) {
                String direction = architecture ? "LR" : "TD";

                if (line.contains("LR")) {
                    direction = "LR";
                } else if (line.contains("TD")) {
                    direction = "TD";
                }

                result.add("flowchart " + direction);
                hasHeader = true;
                continue;
            }

            if (isPureAsciiDiagramLine(line)) {
                continue;
            }

            List<String> expandedLines = expandAmpersandArrowLine(line);

            for (String expanded : expandedLines) {
                String safeLine = sanitizeFlowchartLine(expanded);

                if (StringUtils.hasText(safeLine)) {
                    result.add(safeLine);
                }
            }
        }

        if (!hasHeader) {
            result.add(0, architecture ? "flowchart LR" : "flowchart TD");
        }

        if (result.size() <= 1) {
            return "";
        }

        return String.join("\n", result);
    }

    private boolean isPureAsciiDiagramLine(String line) {
        if (!StringUtils.hasText(line)) {
            return true;
        }

        String text = line.trim();

        boolean looksLikeNodeOrEdge =
                text.contains("-->")
                        || text.matches(".*[A-Za-z][A-Za-z0-9_]*\\s*[\\[\\(\\{].*");

        if (looksLikeNodeOrEdge) {
            return false;
        }

        if (text.matches(".*\\+[-=]{3,}\\+.*")) {
            return true;
        }

        if (text.matches(".*={5,}.*")) {
            return true;
        }

        long badCount = text.chars()
                .filter(ch -> ch == '|' || ch == '=' || ch == '+')
                .count();

        return badCount >= 4;
    }

    private List<String> expandAmpersandArrowLine(String line) {
        if (!line.contains("&") || !line.contains("-->")) {
            return List.of(line);
        }

        String[] parts = line.split("-->", 2);
        if (parts.length != 2) {
            return List.of(line);
        }

        String left = parts[0].trim();
        String right = parts[1].trim();

        if (!left.contains("&")) {
            return List.of(line);
        }

        List<String> lines = new ArrayList<>();
        String[] sources = left.split("&");

        for (String source : sources) {
            String sourceNode = source.trim();

            if (StringUtils.hasText(sourceNode)) {
                lines.add(sourceNode + " --> " + right);
            }
        }

        return lines.isEmpty() ? List.of(line) : lines;
    }

    private String sanitizeFlowchartLine(String line) {
        if (!StringUtils.hasText(line)) {
            return "";
        }

        String sanitized = line.trim()
                .replace(";", "")
                .replace("==>", "-->")
                .replace("=>", "-->");

        Pattern nodePattern = Pattern.compile(
                "([A-Za-z][A-Za-z0-9_]*)\\s*[\\[\\(\\{]([^\\]\\)\\}]+)[\\]\\)\\}]"
        );

        Matcher matcher = nodePattern.matcher(sanitized);
        StringBuffer sb = new StringBuffer();

        while (matcher.find()) {
            String nodeId = matcher.group(1);
            String label = sanitizeMermaidLabel(matcher.group(2));

            if (!StringUtils.hasText(label)) {
                label = nodeId;
            }

            matcher.appendReplacement(
                    sb,
                    Matcher.quoteReplacement(nodeId + "[\"" + label + "\"]")
            );
        }

        matcher.appendTail(sb);

        String result = sb.toString()
                .replace("|", " ")
                .replace("+", " ")
                .replace("=", " ")
                .replace(";", "")
                .replaceAll("\\s+", " ")
                .trim();

        if (!StringUtils.hasText(result)) {
            return "";
        }

        return "  " + result;
    }

    private String sanitizeMindmapMermaid(String mermaid, String fallbackTitle) {
        if (!StringUtils.hasText(mermaid)) {
            return "";
        }

        String[] rawLines = mermaid
                .replace("```mermaid", "")
                .replace("```", "")
                .replace("\r", "")
                .split("\n");

        List<String> result = new ArrayList<>();
        boolean hasHeader = false;
        boolean hasRoot = false;

        for (String rawLine : rawLines) {
            if (!StringUtils.hasText(rawLine)) {
                continue;
            }

            String trimmed = rawLine.trim();

            if (trimmed.startsWith("mindmap")) {
                result.add("mindmap");
                hasHeader = true;
                continue;
            }

            if (isPureAsciiDiagramLine(trimmed)) {
                continue;
            }

            int indent = Math.max(2, countLeadingSpaces(rawLine));
            String prefix = " ".repeat(Math.min(indent, 8));

            if (trimmed.startsWith("root")) {
                String label = extractRootLabel(trimmed);
                label = sanitizeMindmapLabel(StringUtils.hasText(label) ? label : fallbackTitle);

                result.add("  root((" + label + "))");
                hasRoot = true;
                continue;
            }

            String label = sanitizeMindmapLabel(trimmed);

            if (StringUtils.hasText(label)) {
                result.add(prefix + label);
            }
        }

        if (!hasHeader) {
            result.add(0, "mindmap");
        }

        if (!hasRoot) {
            result.add(1, "  root((" + sanitizeMindmapLabel(fallbackTitle) + "))");
        }

        return result.size() <= 2 ? "" : String.join("\n", result);
    }

    private int countLeadingSpaces(String text) {
        if (text == null) {
            return 0;
        }

        int count = 0;

        while (count < text.length() && Character.isWhitespace(text.charAt(count))) {
            count++;
        }

        return count;
    }

    private String extractRootLabel(String text) {
        if (text == null) {
            return "";
        }

        int start = text.indexOf("((");
        int end = text.lastIndexOf("))");

        if (start >= 0 && end > start) {
            return text.substring(start + 2, end);
        }

        int normalStart = text.indexOf('(');
        int normalEnd = text.lastIndexOf(')');

        if (normalStart >= 0 && normalEnd > normalStart) {
            return text.substring(normalStart + 1, normalEnd);
        }

        return text.replace("root", "").trim();
    }

    private String sanitizeMindmapLabel(String label) {
        return sanitizeMermaidLabel(label)
                .replace("-->", " ")
                .replace("-", " ")
                .replaceAll("^\\d+\\.\\s*", "")
                .replaceAll("^[-*•]\\s*", "")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String sanitizeMermaidLabel(String label) {
        if (label == null) {
            return "";
        }

        String cleaned = label.trim();

        if ((cleaned.startsWith("\"") && cleaned.endsWith("\""))
                || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
            cleaned = cleaned.substring(1, cleaned.length() - 1);
        }

        cleaned = cleaned
                .replace("\"", "'")
                .replace(":", " - ")
                .replace("(", " - ")
                .replace(")", "")
                .replace("[", " ")
                .replace("]", " ")
                .replace("{", " ")
                .replace("}", " ")
                .replace("|", " ")
                .replace("+", " ")
                .replace("=", " ")
                .replace(";", " ")
                .replace("<", " ")
                .replace(">", " ")
                .replace("\\", " ")
                .replace("/", " ")
                .replace("\n", " ")
                .replace("\r", " ")
                .replaceAll("\\s+", " ")
                .trim();

        if (cleaned.length() > 80) {
            cleaned = cleaned.substring(0, 80).trim();
        }

        return cleaned;
    }

    private String buildFallbackDiagram(
            String title,
            String content,
            NoteRequest.GenerateDiagram.DiagramType diagramType
    ) {
        return switch (diagramType) {
            case MINDMAP -> buildFallbackMindmap(title, content);
            case FLOWCHART -> buildFallbackFlowchart(title, content);
            case ARCHITECTURE -> buildFallbackArchitecture(title, content);
            case SKETCHNOTE -> buildFallbackSketchnote(title, content);
        };
    }

    private List<String> extractKeyLines(String content) {
        if (!StringUtils.hasText(content)) {
            return List.of("Nội dung chính");
        }

        List<String> lines = new ArrayList<>();
        String plainText = RichTextContent.toPlainText(content);

        String[] rawLines = plainText.split("[\\n.!?]+");

        for (String line : rawLines) {
            String cleaned = line.trim().replaceAll("\\s+", " ");

            if (cleaned.length() >= 3) {
                lines.add(cleaned);
            }

            if (lines.size() >= 6) {
                break;
            }
        }

        if (lines.isEmpty()) {
            String shortened = plainText.trim();

            if (shortened.length() > 120) {
                shortened = shortened.substring(0, 120);
            }

            lines.add(shortened);
        }

        return lines;
    }

    private String buildFallbackMindmap(String title, String content) {
        List<String> lines = extractKeyLines(content);

        StringBuilder sb = new StringBuilder();
        sb.append("mindmap\n");
        sb.append("  root((")
                .append(sanitizeMindmapLabel(title))
                .append("))\n");

        for (String line : lines) {
            String label = sanitizeMindmapLabel(line);

            if (StringUtils.hasText(label)) {
                sb.append("    ").append(label).append("\n");
            }
        }

        return sb.toString();
    }

    private String buildFallbackFlowchart(String title, String content) {
        List<String> lines = extractKeyLines(content);

        StringBuilder sb = new StringBuilder();
        sb.append("flowchart TD\n");
        sb.append("  A[\"")
                .append(sanitizeMermaidLabel(title))
                .append("\"]\n");

        char current = 'A';

        for (int i = 0; i < lines.size(); i++) {
            char next = (char) ('B' + i);
            String label = sanitizeMermaidLabel(lines.get(i));

            if (!StringUtils.hasText(label)) {
                continue;
            }

            sb.append("  ").append(next).append("[\"")
                    .append(label)
                    .append("\"]\n");

            sb.append("  ").append(current)
                    .append(" --> ")
                    .append(next)
                    .append("\n");

            current = next;
        }

        return sb.toString();
    }

    private String buildFallbackArchitecture(String title, String content) {
        List<String> lines = extractKeyLines(content);

        StringBuilder sb = new StringBuilder();
        sb.append("flowchart LR\n");
        sb.append("  A[\"")
                .append(sanitizeMermaidLabel(title))
                .append("\"]\n");

        for (int i = 0; i < lines.size(); i++) {
            char node = (char) ('B' + i);
            String label = sanitizeMermaidLabel(lines.get(i));

            if (!StringUtils.hasText(label)) {
                continue;
            }

            sb.append("  ").append(node).append("[\"")
                    .append(label)
                    .append("\"]\n");

            sb.append("  A --> ")
                    .append(node)
                    .append("\n");
        }

        return sb.toString();
    }

    private String buildFallbackSketchnote(String title, String content) {
        List<String> lines = extractKeyLines(content);

        List<Map<String, String>> blocks = new ArrayList<>();
        String[] icons = {"📘", "🧠", "📌", "✅", "💡", "📝"};

        for (int i = 0; i < lines.size(); i++) {
            Map<String, String> block = new LinkedHashMap<>();
            block.put("icon", icons[i % icons.length]);
            block.put("heading", "Ý " + (i + 1));
            block.put("content", lines.get(i));
            blocks.add(block);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("title", title);
        result.put("blocks", blocks);

        try {
            return objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(result);
        } catch (Exception e) {
            return """
                    {
                      "title": "Sketchnote",
                      "blocks": [
                        {
                          "icon": "📝",
                          "heading": "Nội dung chính",
                          "content": "Không thể chuẩn hóa dữ liệu."
                        }
                      ]
                    }
                    """;
        }
    }
}
