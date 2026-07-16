package org.example.velora.dto.response;

import lombok.Builder;
import lombok.Data;

public class DashboardResponse {

    @Data
    @Builder
    public static class StudyProgress {
        private long totalNotes;
        private long notesThisWeek;

        private long totalDocuments;
        private long documentsThisWeek;

        private long totalFlashcards;
        private long flashcardsThisWeek;

        private long totalTasks;
        private long doneTasks;
        private long pendingTasks;
        private long overdueTasks;
        private long upcomingTasks;
        private long tasksWithoutDeadline;

        private double taskCompletionRate;
        private int productivityScore;
    }
}
