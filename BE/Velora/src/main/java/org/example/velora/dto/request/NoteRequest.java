package org.example.velora.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;
import java.util.UUID;

public class NoteRequest {

    @Data
    public static class Create {

        @NotBlank(message = "Tiêu đề không được để trống")
        @Size(max = 255, message = "Tiêu đề tối đa 255 ký tự")
        private String title;

        private String content;

        private List<UUID> tagIds;
    }

    @Data
    public static class Update {

        @Size(max = 255, message = "Tiêu đề tối đa 255 ký tự")
        private String title;

        private String content;

        private List<UUID> tagIds;

        private String editorSessionId;

        private Boolean createVersion = false;
    }

    @Data
    public static class Search {

        private String keyword;
        private List<UUID> tagIds;
        private Boolean isBookmarked;
        private int page = 0;
        private int size = 20;
        private String sortBy = "updatedAt";
        private String sortDir = "DESC";
    }

    @Data
    public static class AiImprove {

        @NotBlank(message = "Nội dung không được để trống")
        private String content;

        private String title;

        private AiAction action;

        public enum AiAction {
            SUMMARIZE, STRUCTURE, SUGGEST_TITLE, CREATE_CHECKLIST, IMPROVE_ALL
        }
    }

    @Data
    public static class GenerateDiagram {

        private DiagramType diagramType;

        public enum DiagramType {
            MINDMAP,
            FLOWCHART,
            ARCHITECTURE,
            SKETCHNOTE
        }
    }
}
