package org.example.velora.job;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.velora.entity.Notification;
import org.example.velora.entity.Schedule;
import org.example.velora.repository.NotificationRepository;
import org.example.velora.repository.ScheduleRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DeadlineReminderJob {

    private final ScheduleRepository scheduleRepository;
    private final NotificationRepository notificationRepository;

    @Scheduled(fixedDelayString = "${app.reminder.scan-delay-ms:60000}")
    @Transactional
    public void scanDeadlines() {
        LocalDate today = LocalDate.now();
        LocalDate tomorrow = today.plusDays(1);

        List<Schedule> overdueTasks =
                scheduleRepository.findByIsDoneFalseAndDeadlineBeforeOrderByDeadlineAsc(today);

        List<Schedule> upcomingTasks =
                scheduleRepository.findByIsDoneFalseAndDeadlineBetweenOrderByDeadlineAsc(today, tomorrow);

        int created = 0;

        for (Schedule task : overdueTasks) {
            if (createReminderIfNeeded(task, today)) {
                created++;
            }
        }

        for (Schedule task : upcomingTasks) {
            if (createReminderIfNeeded(task, today)) {
                created++;
            }
        }

        if (created > 0) {
            log.info("Deadline reminder job created {} notifications", created);
        }
    }

    private boolean createReminderIfNeeded(Schedule task, LocalDate today) {
        if (task.getUser() == null || task.getDeadline() == null) {
            return false;
        }

        String title = buildTitle(task, today);
        String message = buildMessage(task, today);

        boolean existed = notificationRepository.existsByUserIdAndTitleAndMessage(
                task.getUser().getId(),
                title,
                message
        );

        if (existed) {
            return false;
        }

        Notification notification = Notification.builder()
                .user(task.getUser())
                .title(title)
                .message(message)
                .isBroadcast(false)
                .isRead(false)
                .build();

        notificationRepository.save(notification);
        return true;
    }

    private String buildTitle(Schedule task, LocalDate today) {
        long days = ChronoUnit.DAYS.between(today, task.getDeadline());

        if (days < 0) {
            return "Deadline đã quá hạn";
        }

        if (days == 0) {
            return "Deadline hôm nay";
        }

        if (days == 1) {
            return "Deadline ngày mai";
        }

        return "Sắp đến deadline";
    }

    private String buildMessage(Schedule task, LocalDate today) {
        long days = ChronoUnit.DAYS.between(today, task.getDeadline());

        String taskName = task.getTaskName() != null
                ? task.getTaskName()
                : "Công việc chưa đặt tên";

        String deadline = task.getDeadline().toString();
        String priority = task.getPriority() != null
                ? task.getPriority().name()
                : "MEDIUM";

        if (days < 0) {
            return "Công việc \"" + taskName + "\" đã quá hạn từ ngày "
                    + deadline + ". Mức ưu tiên: " + priority + ".";
        }

        if (days == 0) {
            return "Công việc \"" + taskName + "\" có deadline hôm nay ("
                    + deadline + "). Mức ưu tiên: " + priority + ".";
        }

        if (days == 1) {
            return "Công việc \"" + taskName + "\" sẽ đến hạn vào ngày mai ("
                    + deadline + "). Mức ưu tiên: " + priority + ".";
        }

        return "Công việc \"" + taskName + "\" sắp đến hạn vào ngày "
                + deadline + ". Mức ưu tiên: " + priority + ".";
    }
}