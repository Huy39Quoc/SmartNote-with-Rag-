package org.example.velora.repository;

import org.example.velora.entity.KnowledgeGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface KnowledgeGroupRepository extends JpaRepository<KnowledgeGroup, UUID> {
    List<KnowledgeGroup> findByUserIdOrderByCreatedAtDesc(UUID userId);
    long countByUserId(UUID userId);
}
