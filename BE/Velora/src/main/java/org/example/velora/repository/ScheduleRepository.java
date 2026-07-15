package org.example.velora.repository;

import org.example.velora.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface ScheduleRepository extends JpaRepository<Schedule, UUID> {

    List<Schedule> findByUserIdAndIsDoneFalseOrderByDeadlineAsc(UUID userId);

    List<Schedule> findByUserIdOrderByDeadlineAsc(UUID userId);

    @Query("SELECT s FROM Schedule s WHERE s.user.id = :uid AND s.deadline BETWEEN :from AND :to AND s.isDone = :done")
    List<Schedule> findUpcoming(
            @Param("uid")  UUID userId,
            @Param("from") LocalDate from,
            @Param("to")   LocalDate to,
            @Param("done") Boolean done
    );

    @Query("SELECT s FROM Schedule s WHERE s.user.id = :uid AND s.deadline < :today AND s.isDone = :done")
    List<Schedule> findOverdue(
            @Param("uid")   UUID userId,
            @Param("today") LocalDate today,
            @Param("done")  Boolean done
    );

    long countByUserId(UUID userId);

    long countByUserIdAndIsDoneTrue(UUID userId);

    long countByUserIdAndIsDoneFalse(UUID userId);

    long countByUserIdAndIsDoneFalseAndDeadlineBefore(UUID userId, LocalDate today);

    long countByUserIdAndIsDoneFalseAndDeadlineBetween(UUID userId, LocalDate from, LocalDate to);

    long countByUserIdAndDeadlineIsNull(UUID userId);
    long countByUserIdAndIsDoneFalseAndDeadlineIsNull(UUID userId);
    List<Schedule> findByIsDoneFalseAndDeadlineBetweenOrderByDeadlineAsc(
            LocalDate from,
            LocalDate to
    );

    List<Schedule> findByIsDoneFalseAndDeadlineBeforeOrderByDeadlineAsc(
            LocalDate today
    );

    boolean existsByUserIdAndNoteIdAndTaskNameAndDeadline(
            UUID userId,
            UUID noteId,
            String taskName,
            LocalDate deadline
    );
}
