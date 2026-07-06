package org.example.velora.repository;

import org.example.velora.entity.NoteVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NoteVersionRepository extends JpaRepository<NoteVersion, UUID> {

    List<NoteVersion> findByNoteIdOrderByVersionNumberDesc(UUID noteId);

    Optional<NoteVersion> findTopByNoteIdOrderByVersionNumberDesc(UUID noteId);

    int countByNoteId(UUID noteId);
}
