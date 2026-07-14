package org.example.velora.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "landing_contents", uniqueConstraints = @UniqueConstraint(columnNames = "content_status"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LandingContent {
    public enum Status { DRAFT, PUBLISHED }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "UNIQUEIDENTIFIER", updatable = false, nullable = false)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "content_status", nullable = false, length = 20)
    private Status status;

    @Column(name = "hero_badge", nullable = false, columnDefinition = "NVARCHAR(255)")
    private String heroBadge;
    @Column(name = "hero_title", nullable = false, columnDefinition = "NVARCHAR(255)")
    private String heroTitle;
    @Column(name = "hero_highlight", nullable = false, columnDefinition = "NVARCHAR(255)")
    private String heroHighlight;
    @Column(name = "hero_description", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String heroDescription;
    @Column(name = "primary_button_text", nullable = false, columnDefinition = "NVARCHAR(100)")
    private String primaryButtonText;
    @Column(name = "secondary_button_text", nullable = false, columnDefinition = "NVARCHAR(100)")
    private String secondaryButtonText;
    @Column(name = "feature_section_title", nullable = false, columnDefinition = "NVARCHAR(255)")
    private String featureSectionTitle;
    @Column(name = "feature_section_description", nullable = false, columnDefinition = "NVARCHAR(500)")
    private String featureSectionDescription;
    @Column(name = "features_json", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String featuresJson;
    @Column(name = "step_section_title", nullable = false, columnDefinition = "NVARCHAR(255)")
    private String stepSectionTitle;
    @Column(name = "step_section_description", nullable = false, columnDefinition = "NVARCHAR(500)")
    private String stepSectionDescription;
    @Column(name = "steps_json", nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String stepsJson;
    @Column(name = "cta_title", nullable = false, columnDefinition = "NVARCHAR(255)")
    private String ctaTitle;
    @Column(name = "cta_description", nullable = false, columnDefinition = "NVARCHAR(500)")
    private String ctaDescription;
    @Column(name = "cta_button_text", nullable = false, columnDefinition = "NVARCHAR(100)")
    private String ctaButtonText;
    @Column(name = "footer_text", nullable = false, columnDefinition = "NVARCHAR(500)")
    private String footerText;
    @Column(name = "text_styles_json", columnDefinition = "NVARCHAR(MAX)")
    private String textStylesJson;

    @Column(name = "updated_by", columnDefinition = "UNIQUEIDENTIFIER")
    private UUID updatedBy;
    @CreationTimestamp @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    @UpdateTimestamp @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
