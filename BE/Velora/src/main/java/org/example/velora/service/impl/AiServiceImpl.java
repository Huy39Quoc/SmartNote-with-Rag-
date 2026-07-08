package org.example.velora.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.velora.exception.BadRequestException;
import org.example.velora.util.LmStudioClient;
import org.example.velora.util.ChromaDbClient;
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
                case SUMMARIZE ->
                    b.summary(lmStudioClient.complete(
                            getPrompt("note.summarize") + "\n\n" + content));
                case STRUCTURE ->
                    b.improvedContent(lmStudioClient.complete(
                            getPrompt("note.structure") + "\n\n" + content));
                case SUGGEST_TITLE -> {
                    String raw = lmStudioClient.complete(getPrompt("note.suggest_title") + "\n\n" + content);
                    List<String> titles = parseJsonArray(raw);
                    b.suggestedTitle(titles.isEmpty() ? "Ghi chú mới" : titles.get(0)).keyPoints(titles);
                }
                case CREATE_CHECKLIST ->
                    b.checklist(parseJsonArray(
                            lmStudioClient.complete(getPrompt("note.checklist") + "\n\n" + content)));
                case IMPROVE_ALL ->
                    b
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
        """ + "\n" + note.getContent();

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
        if (!StringUtils.hasText(content)) {
            throw new BadRequestException("Ghi chú không có nội dung để tạo sơ đồ.");
        }

        if (diagramType == null) {
            throw new BadRequestException("Vui lòng chọn loại sơ đồ.");
        }

        String safeTitle = StringUtils.hasText(title) ? title.trim() : "Ghi chú";
        String truncated = content.length() > 5000 ? content.substring(0, 5000) : content;

        String prompt = buildDiagramPrompt(safeTitle, truncated, diagramType);

        try {
            String raw = lmStudioClient.complete(prompt);

            if (!StringUtils.hasText(raw)) {
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
            - Không viết thêm mở đầu/kết luận.
            - Không markdown thừa ngoài nội dung cần thiết.
            - Nội dung phải ngắn gọn, dễ học, dễ nhìn.
            """;

        return switch (diagramType) {
            case MINDMAP ->
                """
                %s

                Hãy tạo sơ đồ Mermaid mindmap từ ghi chú sau.

                BẮT BUỘC:
                - Chỉ trả về code Mermaid.
                - Dòng đầu tiên phải là: mindmap
                - Dùng cấu trúc mindmap chuẩn Mermaid.
                - Node gốc là tiêu đề note.

                Ví dụ format:
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

            case FLOWCHART ->
                """
                %s

                Hãy tạo sơ đồ Mermaid flowchart từ ghi chú sau.

                BẮT BUỘC:
                - Chỉ trả về code Mermaid.
                - Dòng đầu tiên phải là: flowchart TD
                - Mỗi bước phải ngắn gọn.
                - Nếu nội dung không phải quy trình, hãy tự chuyển thành luồng học/ý chính.

                Ví dụ format:
                flowchart TD
                  A[Đọc đề] --> B[Phân tích]
                  B --> C[Thực hiện]
                  C --> D[Kiểm tra]

                Tiêu đề:
                %s

                Nội dung:
                %s
                """.formatted(common, title, content);

            case ARCHITECTURE ->
                """
    %s

    Hãy tạo Mermaid flowchart LR từ ghi chú sau.

    BẮT BUỘC:
    - Chỉ trả về code Mermaid.
    - Dòng đầu tiên phải là: flowchart LR
    - Mỗi node phải dùng dạng: A["Nội dung"]
    - Không dùng dấu ngoặc tròn () trong label.
    - Không dùng dấu hai chấm : trong label.
    - Không dùng dấu chấm phẩy ;.
    - Không dùng cú pháp A & B & C --> D.
    - Nếu nhiều node cùng trỏ đến một node, hãy viết từng dòng riêng.
    - Dùng dấu gạch ngang - thay cho dấu ngoặc hoặc dấu hai chấm.

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

            case SKETCHNOTE ->
                """
                %s

                Hãy tạo Sketchnote JSON từ ghi chú sau.

                BẮT BUỘC:
                - Chỉ trả về JSON object hợp lệ.
                - Không giải thích.
                - Không thêm chữ ngoài JSON.
                - Không dùng ```json.

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
                - 4 đến 8 blocks
                - content ngắn gọn
                - icon là emoji

                Tiêu đề:
                %s

                Nội dung:
                %s
                """.formatted(common, title, content);
        };
    }

    private String cleanDiagramOutput(
            String raw,
            NoteRequest.GenerateDiagram.DiagramType diagramType
    ) {
        if (raw == null || raw.isBlank()) {
            throw new BadRequestException("AI không trả về nội dung sơ đồ.");
        }

        String cleaned = raw.trim()
                .replace("```mermaid", "")
                .replace("```json", "")
                .replace("```", "")
                .trim();

        if (diagramType == NoteRequest.GenerateDiagram.DiagramType.SKETCHNOTE) {
            int start = cleaned.indexOf('{');
            int end = cleaned.lastIndexOf('}');

            if (start >= 0 && end > start) {
                return cleaned.substring(start, end + 1).trim();
            }

            String safeText = cleaned
                    .replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\r", "")
                    .replace("\n", "\\n");

            return """
                {
                  "title": "Sketchnote",
                  "blocks": [
                    {
                      "icon": "📝",
                      "heading": "Nội dung chính",
                      "content": "%s"
                    }
                  ]
                }
                """.formatted(safeText);
        }

        if (diagramType == NoteRequest.GenerateDiagram.DiagramType.MINDMAP) {
            int index = cleaned.indexOf("mindmap");

            if (index >= 0) {
                return cleaned.substring(index).trim();
            }

            throw new BadRequestException("AI trả về Mindmap không đúng định dạng Mermaid.");
        }

        if (diagramType == NoteRequest.GenerateDiagram.DiagramType.FLOWCHART
                || diagramType == NoteRequest.GenerateDiagram.DiagramType.ARCHITECTURE) {
            int index = cleaned.indexOf("flowchart");

            if (index >= 0) {
                return cleaned.substring(index).trim();
            }

            throw new BadRequestException("AI trả về diagram không đúng định dạng Mermaid.");
        }

        return cleaned;
    }

    private String normalizeDiagramOutput(
            String raw,
            String title,
            String content,
            NoteRequest.GenerateDiagram.DiagramType diagramType
    ) {
        String cleaned = raw.trim()
                .replace("```mermaid", "")
                .replace("```json", "")
                .replace("```", "")
                .trim();

        return switch (diagramType) {
            case SKETCHNOTE ->
                normalizeSketchnote(cleaned, title, content);
            case MINDMAP ->
                normalizeMindmap(cleaned, title, content);
            case FLOWCHART ->
                normalizeFlowchart(cleaned, title, content, false);
            case ARCHITECTURE ->
                normalizeFlowchart(cleaned, title, content, true);
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

        if (index < 0) {
            return buildFallbackMindmap(title, content);
        }

        String body = cleaned.substring(index).trim();
        return sanitizeMindmapMermaid(body, title);
    }

    private String sanitizeMindmapMermaid(String mermaid, String title) {
        String safeTitle = escapeMermaid(title).replace("(", "-").replace(")", "");

        if (!StringUtils.hasText(mermaid)) {
            return "mindmap\n  root((" + safeTitle + "))\n";
        }

        String[] lines = mermaid.replace("\r", "").split("\n");
        List<String> result = new ArrayList<>();
        boolean rootHandled = false;

        Pattern rootPattern = Pattern.compile("^[A-Za-z0-9_]*\\(\\((.*)\\)\\)$");

        for (String rawLine : lines) {
            if (!StringUtils.hasText(rawLine)) {
                continue;
            }

            String trimmed = rawLine.trim();

            if (trimmed.equalsIgnoreCase("mindmap")) {
                result.add("mindmap");
                continue;
            }

            // Giữ nguyên độ thụt lề (dựa vào số khoảng trắng đầu dòng) để bảo toàn cấp bậc.
            int indentSpaces = rawLine.length() - rawLine.replaceAll("^\\s+", "").length();
            String prefix = "  ".repeat(Math.max(1, indentSpaces / 2 + 1));

            Matcher rootMatcher = rootPattern.matcher(trimmed);

            if (!rootHandled && rootMatcher.matches()) {
                String label = sanitizeMermaidLabel(rootMatcher.group(1)).replace("(", "-").replace(")", "");
                result.add("  root((" + (StringUtils.hasText(label) ? label : safeTitle) + "))");
                rootHandled = true;
                continue;
            }

            // Loại bỏ id node + mọi ký tự bao hình (ngoặc vuông/tròn/nhọn) còn sót lại,
            // chỉ giữ lại phần chữ để tránh vỡ cú pháp mindmap khi nội dung dài/phức tạp.
            String textOnly = trimmed
                    .replaceAll("^[A-Za-z][A-Za-z0-9_]*", "")
                    .replaceAll("^[\\[\\(\\{]+", "")
                    .replaceAll("[\\]\\)\\}]+$", "");

            String label = sanitizeMermaidLabel(textOnly);

            if (!StringUtils.hasText(label)) {
                continue;
            }

            // Nếu AI chưa từng khai báo root, node hợp lệ đầu tiên sẽ được dùng làm root
            // để đảm bảo mindmap luôn có đúng 1 gốc (bắt buộc với cú pháp Mermaid mindmap).
            if (!rootHandled) {
                result.add("  root((" + label.replace("(", "-").replace(")", "") + "))");
                rootHandled = true;
                continue;
            }

            result.add(prefix + label);
        }

        if (!rootHandled) {
            result.add(1, "  root((" + safeTitle + "))");
        }

        if (result.size() <= 1) {
            return "mindmap\n  root((" + safeTitle + "))\n";
        }

        return String.join("\n", result);
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
            return sanitizeFlowchartMermaid(mermaid);
        }

        return architecture
                ? buildFallbackArchitecture(title, content)
                : buildFallbackFlowchart(title, content);
    }

    private String buildFallbackDiagram(
            String title,
            String content,
            NoteRequest.GenerateDiagram.DiagramType diagramType
    ) {
        return switch (diagramType) {
            case MINDMAP ->
                buildFallbackMindmap(title, content);
            case FLOWCHART ->
                buildFallbackFlowchart(title, content);
            case ARCHITECTURE ->
                buildFallbackArchitecture(title, content);
            case SKETCHNOTE ->
                buildFallbackSketchnote(title, content);
        };
    }

    private List<String> extractKeyLines(String content) {
        if (!StringUtils.hasText(content)) {
            return List.of("Nội dung chính");
        }

        List<String> lines = new ArrayList<>();

        String[] rawLines = content.split("[\\n.!?]+");
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
            String shortened = content.trim();
            if (shortened.length() > 120) {
                shortened = shortened.substring(0, 120);
            }
            lines.add(shortened);
        }

        return lines;
    }

    private String escapeMermaid(String text) {
        if (text == null) {
            return "";
        }
        return text
                .replace("\"", "'")
                .replace("[", "(")
                .replace("]", ")")
                .replace("{", "(")
                .replace("}", ")")
                .replace("<", "")
                .replace(">", "")
                .replace("\n", " ")
                .replace("\r", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private String buildFallbackMindmap(String title, String content) {
        List<String> lines = extractKeyLines(content);

        StringBuilder sb = new StringBuilder();
        sb.append("mindmap\n");
        String safeTitle = escapeMermaid(title).replace("(", "-").replace(")", "");
        sb.append("  root((").append(safeTitle).append("))\n");

        for (String line : lines) {
            sb.append("    ").append(escapeMermaid(line)).append("\n");
        }

        return sb.toString();
    }

    private String buildFallbackFlowchart(String title, String content) {
        List<String> lines = extractKeyLines(content);

        StringBuilder sb = new StringBuilder();
        sb.append("flowchart TD\n");
        sb.append("  A[\"").append(escapeMermaid(title)).append("\"]\n");

        char current = 'A';
        for (int i = 0; i < lines.size(); i++) {
            char next = (char) ('B' + i);
            sb.append("  ").append(next).append("[\"")
                    .append(escapeMermaid(lines.get(i)))
                    .append("\"]\n");
            sb.append("  ").append(current).append(" --> ").append(next).append("\n");
            current = next;
        }

        return sb.toString();
    }

    private String buildFallbackArchitecture(String title, String content) {
        List<String> lines = extractKeyLines(content);

        StringBuilder sb = new StringBuilder();
        sb.append("flowchart LR\n");
        sb.append("  A[").append(escapeMermaid(title)).append("]\n");

        for (int i = 0; i < lines.size(); i++) {
            char node = (char) ('B' + i);
            sb.append("  ").append(node).append("[")
                    .append(escapeMermaid(lines.get(i)))
                    .append("]\n");
            sb.append("  A --> ").append(node).append("\n");
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

    private String sanitizeMermaid(String mermaid) {
        if (mermaid == null) {
            return "";
        }

        return mermaid
                .replace("(", " - ")
                .replace(")", "")
                .replace(":", " - ")
                .replaceAll("\\s+", " ")
                .replace("flowchart LR ", "flowchart LR\n  ")
                .replace("flowchart TD ", "flowchart TD\n  ")
                .trim();
    }

    private String sanitizeFlowchartMermaid(String mermaid) {
        if (!StringUtils.hasText(mermaid)) {
            return "";
        }

        String[] lines = mermaid
                .replace("```mermaid", "")
                .replace("```", "")
                .replace("\r", "")
                .split("\n");

        List<String> result = new ArrayList<>();

        for (String rawLine : lines) {
            String line = rawLine.trim();

            if (!StringUtils.hasText(line)) {
                continue;
            }

            line = line.replace(";", "");

            if (line.startsWith("flowchart")) {
                result.add(line);
                continue;
            }

            List<String> expanded = expandAmpersandArrowLine(line);

            for (String item : expanded) {
                result.add(sanitizeFlowchartLine(item));
            }
        }

        if (result.isEmpty()) {
            return "flowchart TD\n  A[\"Không thể tạo sơ đồ\"]";
        }

        return String.join("\n", result);
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
        String sanitized = line;

        // Xử lý riêng từng loại ngoặc (tròn / vuông / nhọn) để tránh bắt nhầm
        // ngoặc đóng của loại khác nhau -> sinh ký tự thừa gây lỗi cú pháp Mermaid.
        sanitized = replaceNodeShape(sanitized, '{', '}');
        sanitized = replaceNodeShape(sanitized, '(', ')');
        sanitized = replaceNodeShape(sanitized, '[', ']');

        // Lưới an toàn cuối cùng: sau khi chuẩn hoá, không được còn dấu ngoặc nhọn nào.
        sanitized = sanitized.replace("{", "").replace("}", "");

        return "  " + sanitized.trim();
    }

    private String replaceNodeShape(String line, char open, char close) {
        String openEsc = "\\" + open;
        String closeEsc = "\\" + close;

        Pattern nodePattern = Pattern.compile(
                "([A-Za-z][A-Za-z0-9_]*)\\s*" + openEsc + "([^" + closeEsc + "]*)" + closeEsc
        );

        Matcher matcher = nodePattern.matcher(line);
        StringBuffer sb = new StringBuffer();

        while (matcher.find()) {
            String nodeId = matcher.group(1);
            String label = sanitizeMermaidLabel(matcher.group(2));

            matcher.appendReplacement(
                    sb,
                    Matcher.quoteReplacement(nodeId + "[\"" + label + "\"]")
            );
        }

        matcher.appendTail(sb);

        return sb.toString();
    }

    private String sanitizeMermaidLabel(String label) {
        if (label == null) {
            return "";
        }

        return label
                .replace("\"", "'")
                .replace(":", " - ")
                .replace("(", " - ")
                .replace(")", "")
                .replace("[", "")
                .replace("]", "")
                .replace("{", "")
                .replace("}", "")
                .replace(";", "")
                .replace("<", "")
                .replace(">", "")
                .replace("\n", " ")
                .replace("\r", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }
}
