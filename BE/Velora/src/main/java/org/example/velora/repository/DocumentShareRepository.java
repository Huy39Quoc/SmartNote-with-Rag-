package org.example.velora.repository;

import org.example.velora.entity.DocumentShare;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentShareRepository extends JpaRepository<DocumentShare, UUID> {

    Optional<DocumentShare> findByDocumentIdAndSharedWithId(
            UUID documentId,
            UUID sharedWithId
    );

    boolean existsByDocumentIdAndSharedWithId(
            UUID documentId,
            UUID sharedWithId
    );

    boolean existsByDocumentIdAndSharedWithIdAndPermissionIn(
            UUID documentId,
            UUID sharedWithId,
            Collection<DocumentShare.Permission> permissions
    );

    List<DocumentShare> findByDocumentIdAndOwnerIdOrderByCreatedAtDesc(
            UUID documentId,
            UUID ownerId
    );

    List<DocumentShare> findBySharedWithIdOrderByCreatedAtDesc(
            UUID sharedWithId
    );
}
