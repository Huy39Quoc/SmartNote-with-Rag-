package org.example.velora.dto.response;

import org.example.velora.entity.User;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

public class UserResponse {

    @Data
    @Builder
    public static class Profile {
        private UUID id;
        private String email;
        private String fullName;
        private User.Role role;
        private LocalDateTime createdAt;

        private String packageName;
        private LocalDateTime packageExpiryDate;
        private Integer aiUsedThisMonth;
        private Integer maxAiFormatsPerMonth;
        private Integer maxNotes;
        private Integer storageGb;
        private Integer maxDevices;
        private String packageFeatures;

        private Long noteCount;
        private Long storageUsedBytes;
    }

    @Data
    @Builder
    public static class AdminView {
        private UUID id;
        private String email;
        private String fullName;
        private User.Role role;
        private Boolean isActive;
        private int noteCount;
        private int documentCount;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data
    @Builder
    public static class Page {
        private java.util.List<AdminView> content;
        private int pageNumber;
        private int pageSize;
        private long totalElements;
        private int totalPages;
        private boolean last;
    }
}
