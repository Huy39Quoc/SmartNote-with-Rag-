package org.example.velora.repository;

import org.example.velora.entity.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {
    Page<Document> findByUserIdOrderByUploadedAtDesc(UUID userId, Pageable pageable);
    List<Document> findByUserIdAndIsEmbeddedFalseAndStatus(UUID userId, Document.Status status);
    long countByUserId(UUID userId);
    long countByStatus(Document.Status status);
}
