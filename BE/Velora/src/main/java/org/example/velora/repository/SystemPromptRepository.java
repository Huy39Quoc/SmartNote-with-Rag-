package org.example.velora.repository;

import org.example.velora.entity.SystemPrompt;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SystemPromptRepository extends JpaRepository<SystemPrompt, UUID> {
    Optional<SystemPrompt> findByPromptKeyAndIsActiveTrue(String promptKey);
    List<SystemPrompt> findAllByOrderByPromptKeyAsc();
}