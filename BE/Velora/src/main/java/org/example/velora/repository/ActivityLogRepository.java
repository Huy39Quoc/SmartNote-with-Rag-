package org.example.velora.repository;

import org.example.velora.entity.ActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, UUID> {
    Page<ActivityLog> findByUserIdOrderByCreatedAtDesc(UUID userId, Pageable pageable);
    Page<ActivityLog> findAllByOrderByCreatedAtDesc(Pageable pageable);
}
