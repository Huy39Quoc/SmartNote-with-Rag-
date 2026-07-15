package org.example.velora.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "schedules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Schedule {

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

    @Column(name = "task_name", nullable = false, length = 255, columnDefinition = "NVARCHAR(255)")
    private String taskName;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String description;

    private LocalDate deadline;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority", length = 10, nullable = false)
    @Builder.Default
    private Priority priority = Priority.MEDIUM;

    @Column(name = "is_done", nullable = false)
    @Builder.Default
    private Boolean isDone = false;

    @Column(name = "extracted_by_ai", nullable = false)
    @Builder.Default
    private Boolean extractedByAi = false;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum Priority {
        URGENT, HIGH, MEDIUM, LOW
    }
}
