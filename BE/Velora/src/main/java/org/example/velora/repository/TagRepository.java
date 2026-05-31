package org.example.velora.repository;

import org.example.velora.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TagRepository extends JpaRepository<Tag, UUID> {
    List<Tag> findByUserIdOrderByNameAsc(UUID userId);
    Optional<Tag> findByUserIdAndName(UUID userId, String name);
    boolean existsByUserIdAndName(UUID userId, String name);
}