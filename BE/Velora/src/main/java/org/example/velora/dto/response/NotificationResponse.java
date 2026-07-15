package org.example.velora.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

public class NotificationResponse {

    @Data
    @Builder
    public static class Item {
        private UUID id;
        private String title;
        private String message;
        private Boolean isBroadcast;
        private Boolean isRead;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    public static class UnreadCount {
        private long count;
    }
}
