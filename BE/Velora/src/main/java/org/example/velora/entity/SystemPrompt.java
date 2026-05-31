package org.example.velora.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "system_prompts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SystemPrompt {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    // Cập nhật trường ID sang UNIQUEIDENTIFIER
    @Column(name = "id", columnDefinition = "UNIQUEIDENTIFIER", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "prompt_key", nullable = false, unique = true, length = 100)
    private String promptKey;

    @Column(name = "prompt_text", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String promptText;

    @Column(length = 255)
    private String description;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    // Cập nhật trường updatedBy sang UNIQUEIDENTIFIER để đồng bộ dữ liệu với User Id
    @Column(name = "updated_by", columnDefinition = "UNIQUEIDENTIFIER")
    private UUID updatedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}