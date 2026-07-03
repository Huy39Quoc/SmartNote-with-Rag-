package org.example.velora.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "note_versions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NoteVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "UNIQUEIDENTIFIER", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "note_id", columnDefinition = "UNIQUEIDENTIFIER", nullable = false)
    private Note note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "edited_by", columnDefinition = "UNIQUEIDENTIFIER")
    private User editedBy;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(nullable = false, length = 255, columnDefinition = "NVARCHAR(255)")
    private String title;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String content;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
