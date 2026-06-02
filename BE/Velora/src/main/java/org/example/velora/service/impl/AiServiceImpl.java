package org.example.velora.service.impl;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.velora.client.LmStudioClient;
import org.example.velora.client.ChromaDbClient;
import org.example.velora.dto.request.NoteRequest;
import org.example.velora.dto.response.*;
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
import java.nio.file.Files;
import java.time.LocalDate;
import java.util.*;

@Service @RequiredArgsConstructor @Slf4j
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
        if (StringUtils.hasText(instruction)) prompt = instruction + "\n\n" + prompt;
        try {
            String raw = lmStudioClient.complete(prompt + "\n\n" + truncated);

            // Sửa đổi: Sử dụng TypeReference để định nghĩa chính xác kiểu dữ liệu Map<String, Object>
            Map<String, Object> parsed = objectMapper.readValue(
                    cleanJson(raw, '{'),
                    new TypeReference<Map<String, Object>>() {}
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
                .limit(3)
                .toList();

        String context = String.join("\n---\n", limitedChunks);

        String systemPrompt =
                "Bạn là trợ lý RAG. Chỉ trả lời dựa trên ngữ cảnh được cung cấp. " +
                        "Trả lời bằng tiếng Việt, ngắn gọn, trực tiếp. " +
                        "Không suy luận dài. Không dùng markdown phức tạp.";

        String userMsg =
                "Dựa vào ngữ cảnh sau, hãy trả lời câu hỏi.\n\n" +
                        "Ngữ cảnh:\n" + context + "\n\n" +
                        "Câu hỏi: " + question + "\n\n" +
                        "Yêu cầu: trả lời trong tối đa 5 câu.";

        String answer = lmStudioClient.chatComplete(systemPrompt, userMsg);

        if (answer == null || answer.isBlank()
                || answer.contains("Không thể kết nối AI")
                || answer.contains("AI chưa trả về nội dung")) {
            return "Mình đã tìm thấy nội dung liên quan trong tài liệu, nhưng model AI trả lời quá lâu. " +
                    "Nội dung tìm được là:\n\n" + context;
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
                    new TypeReference<List<Map<String, Object>>>() {}
            );

            List<ScheduleResponse.Item> extracted = new ArrayList<>();

            for (Map<String, Object> m : items) {
                if (m == null) continue;

                String taskName = asText(m.get("task"));
                if (!StringUtils.hasText(taskName)) {
                    taskName = asText(m.get("taskName"));
                }

                String deadlineStr = asText(m.get("deadline"));
                LocalDate deadline = parseFlexibleDate(deadlineStr);

                if (!StringUtils.hasText(taskName) && deadline != null) {
                    taskName = buildTaskNameAroundDate(originalContent, deadlineStr);
                }

                if (!StringUtils.hasText(taskName)) continue;

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
                if (year < 100) year += 2000;
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
        if (text == null) return "Công việc";

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
            if (year < 100) year += 2000;
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
            String raw = lmStudioClient.complete(getPrompt("knowledge.classify") + "\n\n" + content);

            // Sửa đổi: Thay thế Map<?, ?> bằng Map<String, Object> tường minh
            Map<String, Object> parsed = objectMapper.readValue(
                    cleanJson(raw, '{'),
                    new TypeReference<Map<String, Object>>() {}
            );

            return KnowledgeGroupResponse.ClassifyResult.builder()
                    .suggestedGroupName((String) parsed.getOrDefault("groupName", "Chung"))
                    .reasoning((String) parsed.getOrDefault("reasoning", "")).build();
        } catch (Exception e) {
            return KnowledgeGroupResponse.ClassifyResult.builder()
                    .suggestedGroupName("Chung").reasoning("").build();
        }
    }

    /**
     * Transcribe audio file → text tiếng Việt.
     * LM Studio hiện chưa hỗ trợ audio trực tiếp qua /v1/audio/transcriptions
     * nên dùng phương án: đọc file binary → base64 → gửi kèm prompt mô tả.
     * Trong production nên thay bằng Whisper API hoặc faster-whisper local.
     */
    @Override
    public String transcribeAudioFile(String filePath) {
        try {
            // Thử gọi /v1/audio/transcriptions nếu LM Studio hỗ trợ (version mới)
            return chromaDbClient.transcribeAudio(filePath, "vi");
        } catch (Exception e) {
            log.warn("LM Studio audio transcription not supported, using fallback: {}", e.getMessage());
            // Fallback: trả về thông báo để xử lý thủ công
            return "[Cần cài Whisper để phân tích âm thanh. File: " + new File(filePath).getName() + "]";
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

    private List<String> parseJsonArray(String raw) {
        try {
            // Sửa đổi: Định hình rõ cấu trúc kiểu dữ liệu List<String> khi nhận mảng từ JSON
            return objectMapper.readValue(cleanJson(raw, '['), new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return List.of(raw.trim());
        }
    }

    private String cleanJson(String raw, char startChar) {
        if (raw == null) return startChar == '[' ? "[]" : "{}";
        raw = raw.trim();
        int idx = raw.indexOf(startChar);
        return idx >= 0 ? raw.substring(idx) : raw;
    }
}