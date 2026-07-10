package org.example.velora.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class KnowledgeGroupResponse {

    @Data
    @Builder
    public static class GraphNode {
        private String id;
        private String type;
        private String title;
    }

    @Data
    @Builder
    public static class GraphEdge {
        private String from;
        private String to;
        private double weight;
    }

    @Data
    @Builder
    public static class GraphResult {
        private List<GraphNode> nodes;
        private List<GraphEdge> edges;
    }

    @Data
    @Builder
    public static class Summary {

        private UUID id;
        private String groupName;
        private Boolean suggestedByAi;
        private int noteCount;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    public static class Detail {

        private UUID id;
        private String groupName;
        private Boolean suggestedByAi;
        private String aiReasoning;
        private List<NoteResponse.Summary> notes;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data
    @Builder
    public static class ClassifyResult {

        private String suggestedGroupName;
        private String reasoning;
        private List<UUID> relatedNoteIds;
        private List<String> relatedNoteTitles;
    }

    @Data
    @Builder
    public static class FeedbackResult {

        private UUID id;
        private UUID noteId;
        private UUID groupId;
        private String suggestedGroupName;
        private String correctedGroupName;
        private Boolean correct;
        private String message;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    public static class FeedbackStats {

        private long total;
        private long correct;
        private long incorrect;
        private double accuracyPercent;
    }
}