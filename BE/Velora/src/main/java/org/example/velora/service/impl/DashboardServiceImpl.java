package org.example.velora.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.velora.dto.response.DashboardResponse;
import org.example.velora.repository.DocumentRepository;
import org.example.velora.repository.FlashcardRepository;
import org.example.velora.repository.NoteRepository;
import org.example.velora.repository.ScheduleRepository;
import org.example.velora.service.DashboardService;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final NoteRepository noteRepository;
    private final DocumentRepository documentRepository;
    private final FlashcardRepository flashcardRepository;
    private final ScheduleRepository scheduleRepository;

    @Override
    public DashboardResponse.StudyProgress getStudyProgress(UUID userId) {
        LocalDate today = LocalDate.now();
        LocalDate next7Days = today.plusDays(7);
        LocalDateTime last7Days = LocalDateTime.now().minusDays(7);

        long totalNotes = noteRepository.countByUserId(userId);
        long notesThisWeek = noteRepository.countByUserIdAndCreatedAtAfter(userId, last7Days);

        long totalDocuments = documentRepository.countByUserId(userId);
        long documentsThisWeek = documentRepository.countByUserIdAndUploadedAtAfter(userId, last7Days);

        long totalFlashcards = flashcardRepository.countByUserId(userId);
        long flashcardsThisWeek = flashcardRepository.countByUserIdAndCreatedAtAfter(userId, last7Days);

        long totalTasks = scheduleRepository.countByUserId(userId);
        long doneTasks = scheduleRepository.countByUserIdAndIsDoneTrue(userId);
        long pendingTasks = scheduleRepository.countByUserIdAndIsDoneFalse(userId);
        long overdueTasks = scheduleRepository.countByUserIdAndIsDoneFalseAndDeadlineBefore(userId, today);
        long upcomingTasks = scheduleRepository.countByUserIdAndIsDoneFalseAndDeadlineBetween(userId, today, next7Days);
        long tasksWithoutDeadline = scheduleRepository.countByUserIdAndIsDoneFalseAndDeadlineIsNull(userId);

        double completionRate = totalTasks == 0
                ? 0
                : Math.round((doneTasks * 1000.0 / totalTasks)) / 10.0;

        int productivityScore = calculateProductivityScore(
                totalNotes,
                totalDocuments,
                totalFlashcards,
                totalTasks,
                doneTasks,
                overdueTasks
        );

        return DashboardResponse.StudyProgress.builder()
                .totalNotes(totalNotes)
                .notesThisWeek(notesThisWeek)
                .totalDocuments(totalDocuments)
                .documentsThisWeek(documentsThisWeek)
                .totalFlashcards(totalFlashcards)
                .flashcardsThisWeek(flashcardsThisWeek)
                .totalTasks(totalTasks)
                .doneTasks(doneTasks)
                .pendingTasks(pendingTasks)
                .overdueTasks(overdueTasks)
                .upcomingTasks(upcomingTasks)
                .tasksWithoutDeadline(tasksWithoutDeadline)
                .taskCompletionRate(completionRate)
                .productivityScore(productivityScore)
                .build();
    }

    private int calculateProductivityScore(
            long totalNotes,
            long totalDocuments,
            long totalFlashcards,
            long totalTasks,
            long doneTasks,
            long overdueTasks
    ) {
        int score = 0;

        score += Math.min(25, totalNotes * 2);
        score += Math.min(15, totalDocuments * 3);
        score += Math.min(20, totalFlashcards);
        score += Math.min(25, doneTasks * 5);

        if (totalTasks > 0) {
            score += (int) Math.min(15, (doneTasks * 15.0 / totalTasks));
        }

        score -= Math.min(20, overdueTasks * 5);

        return Math.max(0, Math.min(100, score));
    }
}
