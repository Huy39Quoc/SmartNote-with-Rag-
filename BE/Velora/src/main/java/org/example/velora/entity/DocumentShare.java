package org.example.velora.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "document_shares",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_document_share_document_user",
                        columnNames = {"document_id", "shared_with_user_id"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentShare {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(
            name = "id",
            columnDefinition = "UNIQUEIDENTIFIER",
            updatable = false,
            nullable = false
    )
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "document_id",
            columnDefinition = "UNIQUEIDENTIFIER",
            nullable = false
    )
    private Document document;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "owner_id",
            columnDefinition = "UNIQUEIDENTIFIER",
            nullable = false
    )
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "shared_with_user_id",
            columnDefinition = "UNIQUEIDENTIFIER",
            nullable = false
    )
    private User sharedWith;

    @Enumerated(EnumType.STRING)
    @Column(name = "permission", nullable = false, length = 20)
    private Permission permission;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum Permission {
        VIEW,
        EDIT
    }
}