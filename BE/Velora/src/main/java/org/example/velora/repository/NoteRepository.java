package org.example.velora.repository;

import org.example.velora.entity.Note;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface NoteRepository extends JpaRepository<Note, UUID> {

    Page<Note> findByUserIdOrderByUpdatedAtDesc(UUID userId, Pageable pageable);

    Page<Note> findByUserIdAndIsBookmarkedTrueOrderByUpdatedAtDesc(UUID userId, Pageable pageable);

    @Query("SELECT n FROM Note n WHERE n.user.id = :uid AND (LOWER(n.title) LIKE LOWER(CONCAT('%',:kw,'%')) OR LOWER(n.content) LIKE LOWER(CONCAT('%',:kw,'%')))")
    Page<Note> searchByKeyword(@Param("uid") UUID userId, @Param("kw") String keyword, Pageable pageable);

    @Query("SELECT n FROM Note n JOIN n.tags t WHERE n.user.id = :uid AND t.id IN :tagIds")
    Page<Note> findByUserIdAndTagIds(@Param("uid") UUID userId, @Param("tagIds") List<UUID> tagIds, Pageable pageable);

    List<Note> findTop5ByUserIdOrderByUpdatedAtDesc(UUID userId);

    long countByUserId(UUID userId);
    List<Note> findByUserIdOrderByUpdatedAtDesc(UUID userId);
}