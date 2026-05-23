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
    @Query("SELECT s FROM Schedule s WHERE s.user.id = :uid AND s.deadline BETWEEN :from AND :to AND s.isDone = false")
    List<Schedule> findUpcoming(@Param("uid") UUID userId, @Param("from") LocalDate from, @Param("to") LocalDate to);
    @Query("SELECT s FROM Schedule s WHERE s.user.id = :uid AND s.deadline < :today AND s.isDone = false")
    List<Schedule> findOverdue(@Param("uid") UUID userId, @Param("today") LocalDate today);
    long countByUserIdAndIsDoneFalse(UUID userId);
}
