package org.example.velora.repository;

import org.example.velora.entity.Flashcard;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface FlashcardRepository extends JpaRepository<Flashcard, String> {

    List<Flashcard> findByNoteId(UUID noteId);

    List<Flashcard> findByUserId(UUID userId);

    long countByUserId(UUID userId);

    long countByUserIdAndCreatedAtAfter(UUID userId, LocalDateTime from);

    void deleteByNoteId(UUID noteId);
}
