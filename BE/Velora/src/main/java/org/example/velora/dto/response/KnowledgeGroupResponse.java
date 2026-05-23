package org.example.velora.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class KnowledgeGroupResponse {

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
}
