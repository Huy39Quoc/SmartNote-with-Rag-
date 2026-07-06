package org.example.velora.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class NoteResponse {

    @Data
    @Builder
    public static class Summary {

        private UUID id;
        private String title;
        private String contentPreview;
        private Boolean isBookmarked;
        private List<TagResponse.Simple> tags;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data
    @Builder
    public static class Detail {

        private UUID id;
        private String title;
        private String content;
        private Boolean isBookmarked;
        private Boolean isEmbedded;
        private List<TagResponse.Simple> tags;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private String accessMode;
    }

    @Data
    @Builder
    public static class AiResult {

        private String summary;
        private List<String> keyPoints;
        private String suggestedTitle;
        private List<String> checklist;
        private String improvedContent;
        private String action;
    }

    @Data
    @Builder
    public static class Page {

        private List<Summary> content;
        private int pageNumber;
        private int pageSize;
        private long totalElements;
        private int totalPages;
        private boolean last;
    }

    @Data
    @Builder
    public static class Version {

        private UUID id;
        private UUID noteId;
        private Integer versionNumber;
        private String title;
        private String content;
        private String editedByName;
        private String editedByEmail;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    public static class RealtimeEvent {

        private String type;
        private String editorSessionId;
        private String updatedByName;
        private String updatedByEmail;
        private Detail note;
    }

    @Data
    @Builder
    public static class DiagramResult {

        private UUID noteId;
        private String noteTitle;
        private String diagramType;
        private String format;       // MERMAID hoặc JSON
        private String diagramCode;  // Mermaid code hoặc JSON text
    }
}
