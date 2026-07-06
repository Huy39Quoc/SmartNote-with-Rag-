package org.example.velora.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;
import java.util.UUID;

public class KnowledgeGroupRequest {

    @Data
    public static class Create {

        @NotBlank(message = "Tên nhóm không được để trống")
        @Size(max = 100, message = "Tên nhóm tối đa 100 ký tự")
        private String groupName;

        private List<UUID> noteIds;
    }

    @Data
    public static class Update {

        @Size(max = 100, message = "Tên nhóm tối đa 100 ký tự")
        private String groupName;

        private List<UUID> noteIds;
    }

    @Data
    public static class Classify {

        @NotBlank(message = "Nội dung ghi chú không được để trống")
        private String content;

        private UUID noteId;
    }

    @Data
    public static class ClassificationFeedback {

        private UUID noteId;

        private UUID groupId;

        @NotBlank(message = "Tên nhóm AI gợi ý không được để trống")
        @Size(max = 100, message = "Tên nhóm tối đa 100 ký tự")
        private String suggestedGroupName;

        @Size(max = 100, message = "Tên nhóm đúng tối đa 100 ký tự")
        private String correctedGroupName;

        @NotNull(message = "Vui lòng chọn AI phân loại đúng hay sai")
        private Boolean correct;

        @Size(max = 1000, message = "Lý do AI tối đa 1000 ký tự")
        private String aiReasoning;

        @Size(max = 1000, message = "Ghi chú feedback tối đa 1000 ký tự")
        private String comment;
    }
}