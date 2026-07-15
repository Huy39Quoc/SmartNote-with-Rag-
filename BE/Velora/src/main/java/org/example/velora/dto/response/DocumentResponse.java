package org.example.velora.dto.response;

import org.example.velora.entity.Document;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class DocumentResponse {

    @Data @Builder
    public static class Summary {
        private UUID id;
        private String originalName;
        private Document.FileType fileType;
        private Long fileSize;
        private Document.Status status;
        private Boolean isEmbedded;
        private LocalDateTime uploadedAt;
    }

    @Data @Builder
    public static class Detail {
        private UUID id;
        private String originalName;
        private Document.FileType fileType;
        private Long fileSize;
        private Document.Status status;
        private Boolean isEmbedded;
        private String aiSummary;

        private String audioTranscript;
        private Integer audioDurationSeconds;
        private LocalDateTime uploadedAt;
        private LocalDateTime updatedAt;

        private String myPermission;
    }

    @Data @Builder
    public static class ChatMessage {
        private UUID id;
        private String role;
        private String content;
        private UUID senderId;
        private String senderName;
        private LocalDateTime createdAt;
    }

    @Data @Builder
    public static class ChatHistory {
        private List<ChatMessage> messages;

        private boolean canAsk;
    }

    @Data @Builder
    public static class AnalysisResult {
        private UUID documentId;
        private String summary;
        private List<String> keyPoints;
        private List<String> keywords;
        private List<String> suggestedNotes;
    }

    @Data @Builder
    public static class AskResult {
        private String answer;
        private List<String> sourceParagraphs;
        private Double confidence;
    }

    @Data @Builder
    public static class AudioResult {
        private UUID documentId;
        private String rawTranscript;

        private String structuredNote;
        private String noteTitle;

        private UUID createdNoteId;
    }

    @Data @Builder
    public static class Page {
        private List<Summary> content;
        private int pageNumber;
        private int pageSize;
        private long totalElements;
        private int totalPages;
        private boolean last;
    }
}
