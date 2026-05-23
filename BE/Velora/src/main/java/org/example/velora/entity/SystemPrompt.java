package org.example.velora.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name="system_prompts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SystemPrompt {
    @Id @GeneratedValue(strategy=GenerationType.UUID)
    @Column(columnDefinition="VARCHAR(36)") private UUID id;
    @Column(name="prompt_key",nullable=false,unique=true,length=100) private String promptKey;
    @Column(name="prompt_text",nullable=false,columnDefinition="TEXT") private String promptText;
    @Column(length=255) private String description;
    @Column(name="is_active",nullable=false) @Builder.Default private Boolean isActive = true;
    @Column(name="updated_by",columnDefinition="VARCHAR(36)") private UUID updatedBy;
    @CreationTimestamp @Column(name="created_at",updatable=false) private LocalDateTime createdAt;
    @UpdateTimestamp @Column(name="updated_at") private LocalDateTime updatedAt;
}
