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
            String raw = lmStudioClient.complete(getPrompt("schedule.extract") + "\n\n" + content);

            // Sửa đổi: Đọc danh sách dưới dạng List của các Map<String, Object> để tránh lỗi Wildcard
            List<Map<String, Object>> items = objectMapper.readValue(
                    cleanJson(raw, '['),
                    new TypeReference<List<Map<String, Object>>>() {}
            );

            List<ScheduleResponse.Item> extracted = new ArrayList<>();
            for (Map<String, Object> m : items) {
                if (m == null) continue;
                String taskName = (String) m.get("task");
                if (!StringUtils.hasText(taskName)) continue;
                String deadlineStr = (String) m.get("deadline");
                LocalDate deadline = null;
                try { if (StringUtils.hasText(deadlineStr)) deadline = LocalDate.parse(deadlineStr); }
                catch (Exception ignored) {}
                Schedule.Priority priority;
                try { priority = Schedule.Priority.valueOf((String) m.getOrDefault("priority", "MEDIUM")); }
                catch (Exception e) { priority = Schedule.Priority.MEDIUM; }
                extracted.add(ScheduleResponse.Item.builder()
                        .taskName(taskName).deadline(deadline).priority(priority).build());
            }
            return ScheduleResponse.ExtractResult.builder()
                    .extracted(extracted).totalFound(extracted.size()).rawAiResponse(raw).build();
        } catch (Exception e) {
            log.error("extractSchedules error: {}", e.getMessage());
            return ScheduleResponse.ExtractResult.builder().extracted(List.of()).totalFound(0).build();
        }
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