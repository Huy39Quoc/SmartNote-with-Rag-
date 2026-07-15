package org.example.velora.repository;

import org.example.velora.entity.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {

    Page<Document> findByUserIdOrderByUploadedAtDesc(UUID userId, Pageable pageable);

    List<Document> findByUserIdOrderByUploadedAtDesc(UUID userId);

    List<Document> findByUserIdAndIsEmbeddedFalseAndStatus(
            UUID userId,
            Document.Status status
    );

    long countByUserId(UUID userId);

    long countByStatus(Document.Status status);

    @Query("SELECT COALESCE(SUM(d.fileSize), 0) FROM Document d WHERE d.user.id = :userId")
    Long sumFileSizeByUserId(@Param("userId") UUID userId);

    long countByUserIdAndUploadedAtAfter(UUID userId, LocalDateTime from);
}
