package org.example.velora.dto.response;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

public class TagResponse {

    @Data
    @Builder
    public static class Simple {
        private UUID id;
        private String name;
        private String color;
    }

    @Data
    @Builder
    public static class Detail {
        private UUID id;
        private String name;
        private String color;
        private int noteCount;
        private LocalDateTime createdAt;
    }
}
