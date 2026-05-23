package org.example.velora.dto.response;

import org.example.velora.entity.Schedule;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class ScheduleResponse {

    @Data
    @Builder
    public static class Item {
        private UUID id;
        private String taskName;
        private String description;
        private LocalDate deadline;
        private Schedule.Priority priority;
        private Boolean isDone;
        private Boolean extractedByAi;
        private UUID noteId;
        private String noteTitle;
        private long daysUntilDeadline;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    public static class PriorityList {
        private List<Item> urgent;
        private List<Item> high;
        private List<Item> medium;
        private List<Item> low;
        private List<Item> overdue;
    }

    @Data
    @Builder
    public static class ExtractResult {
        private List<Item> extracted;
        private int totalFound;
        private String rawAiResponse;
    }
}
