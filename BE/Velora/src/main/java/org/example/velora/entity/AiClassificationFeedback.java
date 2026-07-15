package org.example.velora.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ai_classification_feedbacks")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiClassificationFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "UNIQUEIDENTIFIER", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", columnDefinition = "UNIQUEIDENTIFIER", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "note_id", columnDefinition = "UNIQUEIDENTIFIER")
    private Note note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", columnDefinition = "UNIQUEIDENTIFIER")
    private KnowledgeGroup group;

    @Column(name = "suggested_group_name", nullable = false, length = 100, columnDefinition = "NVARCHAR(100)")
    private String suggestedGroupName;

    @Column(name = "corrected_group_name", length = 100, columnDefinition = "NVARCHAR(100)")
    private String correctedGroupName;

    @Column(name = "is_correct", nullable = false)
    private Boolean correct;

    @Column(name = "ai_reasoning", columnDefinition = "NVARCHAR(MAX)")
    private String aiReasoning;

    @Column(name = "comment", columnDefinition = "NVARCHAR(MAX)")
    private String comment;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
