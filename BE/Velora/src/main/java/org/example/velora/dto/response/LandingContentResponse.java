package org.example.velora.dto.response;

import lombok.Builder;
import lombok.Data;
import org.example.velora.dto.request.LandingContentRequest;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data @Builder
public class LandingContentResponse {
    private String status;
    private String heroBadge;
    private String heroTitle;
    private String heroHighlight;
    private String heroDescription;
    private String primaryButtonText;
    private String secondaryButtonText;
    private String featureSectionTitle;
    private String featureSectionDescription;
    private List<LandingContentRequest.FeatureItem> features;
    private String stepSectionTitle;
    private String stepSectionDescription;
    private List<LandingContentRequest.StepItem> steps;
    private String ctaTitle;
    private String ctaDescription;
    private String ctaButtonText;
    private String footerText;
    private Map<String, LandingContentRequest.TextStyle> textStyles;
    private LocalDateTime updatedAt;
}
