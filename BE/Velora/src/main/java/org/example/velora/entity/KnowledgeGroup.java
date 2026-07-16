package org.example.velora.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "knowledge_groups")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KnowledgeGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "UNIQUEIDENTIFIER", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", columnDefinition = "UNIQUEIDENTIFIER", nullable = false)
    private User user;

    @Column(name = "group_name", nullable = false, length = 100, columnDefinition = "NVARCHAR(100)")
    private String groupName;

    @Column(name = "suggested_by_ai", nullable = false)
    @Builder.Default
    private Boolean suggestedByAi = false;

    @Column(name = "ai_reasoning", columnDefinition = "NVARCHAR(MAX)")
    private String aiReasoning;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "knowledge_group_notes",
            joinColumns = @JoinColumn(name = "group_id", columnDefinition = "UNIQUEIDENTIFIER"),
            inverseJoinColumns = @JoinColumn(name = "note_id", columnDefinition = "UNIQUEIDENTIFIER")
    )
    @Builder.Default
    private List<Note> notes = new ArrayList<>();
}
