package org.example.velora.repository;

import org.example.velora.entity.NoteShare;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NoteShareRepository extends JpaRepository<NoteShare, UUID> {

    Optional<NoteShare> findByNoteIdAndSharedWithId(UUID noteId, UUID sharedWithId);

    boolean existsByNoteIdAndSharedWithId(UUID noteId, UUID sharedWithId);

    List<NoteShare> findByNoteIdAndOwnerIdOrderByCreatedAtDesc(UUID noteId, UUID ownerId);

    List<NoteShare> findBySharedWithIdOrderByCreatedAtDesc(UUID sharedWithId);
}