package org.example.velora.repository;

import org.example.velora.entity.LandingContent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface LandingContentRepository extends JpaRepository<LandingContent, UUID> {
    Optional<LandingContent> findByStatus(LandingContent.Status status);
}
