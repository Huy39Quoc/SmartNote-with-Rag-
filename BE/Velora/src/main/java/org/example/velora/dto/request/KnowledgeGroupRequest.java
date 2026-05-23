package org.example.velora.dto.request;

import jakarta.validation.constraints.NotBlank;
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
}
