package org.example.velora.service.impl;

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
            Map<?, ?> parsed = objectMapper.readValue(cleanJson(raw, '{'), Map.class);
            return DocumentResponse.AnalysisResult.builder()
                .summary((String) parsed.get("summary"))
                .keyPoints((List<String>) parsed.getOrDefault("keyPoints", List.of()))
                .keywords((List<String>) parsed.getOrDefault("keywords", List.of()))
                .build();
        } catch (Exception e) {
            log.error("analyzeDocument error: {}", e.getMessage());
            return DocumentResponse.AnalysisResult.builder()
                .summary("Không thể phân tích tài liệu lúc này").build();
        }
    }

    @Override
    public String chatWithContext(String question, List<String> contextChunks) {
        String context = contextChunks.isEmpty() ? "Không có ngữ cảnh liên quan."
            : String.join("\n---\n", contextChunks);
        String userMsg = "Ngữ cảnh:\n" + context + "\n\nCâu hỏi: " + question;
        return lmStudioClient.chatComplete(getPrompt("chat.rag"), userMsg);
    }

    @Override
    public ScheduleResponse.ExtractResult extractSchedules(String content) {
        try {
            String raw = lmStudioClient.complete(getPrompt("schedule.extract") + "\n\n" + content);
            List<?> items = objectMapper.readValue(cleanJson(raw, '['), List.class);
            List<ScheduleResponse.Item> extracted = new ArrayList<>();
            for (Object item : items) {
                if (!(item instanceof Map<?, ?> m)) continue;
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
            Map<?, ?> parsed = objectMapper.readValue(cleanJson(raw, '{'), Map.class);
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
        try { return objectMapper.readValue(cleanJson(raw, '['), List.class); }
        catch (Exception e) { return List.of(raw.trim()); }
    }

    private String cleanJson(String raw, char startChar) {
        if (raw == null) return startChar == '[' ? "[]" : "{}";
        raw = raw.trim();
        int idx = raw.indexOf(startChar);
        return idx >= 0 ? raw.substring(idx) : raw;
    }
}
