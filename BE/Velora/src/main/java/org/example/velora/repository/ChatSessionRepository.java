package org.example.velora.repository;

import org.example.velora.entity.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface ChatSessionRepository extends JpaRepository<ChatSession, UUID> {
    List<ChatSession> findByUserIdOrderByUpdatedAtDesc(UUID userId);
}