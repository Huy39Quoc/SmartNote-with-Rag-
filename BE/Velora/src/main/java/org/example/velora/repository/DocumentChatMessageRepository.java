package org.example.velora.repository;

import org.example.velora.entity.DocumentChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

public interface DocumentChatMessageRepository extends JpaRepository<DocumentChatMessage, UUID> {

    List<DocumentChatMessage> findByDocumentIdOrderByCreatedAtAsc(UUID documentId);

    @Transactional
    void deleteByDocumentId(UUID documentId);
}
