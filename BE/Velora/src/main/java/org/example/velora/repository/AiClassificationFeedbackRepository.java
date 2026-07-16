package org.example.velora.repository;

import org.example.velora.entity.AiClassificationFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AiClassificationFeedbackRepository extends JpaRepository<AiClassificationFeedback, UUID> {

    List<AiClassificationFeedback> findByUserIdOrderByCreatedAtDesc(UUID userId);

    long countByUserId(UUID userId);

    long countByUserIdAndCorrect(UUID userId, Boolean correct);
}
