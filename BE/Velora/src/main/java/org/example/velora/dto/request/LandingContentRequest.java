package org.example.velora.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class LandingContentRequest {
    @NotBlank @Size(max = 255) private String heroBadge;
    @NotBlank @Size(max = 255) private String heroTitle;
    @NotBlank @Size(max = 255) private String heroHighlight;
    @NotBlank @Size(max = 2000) private String heroDescription;
    @NotBlank @Size(max = 100) private String primaryButtonText;
    @NotBlank @Size(max = 100) private String secondaryButtonText;
    @NotBlank @Size(max = 255) private String featureSectionTitle;
    @NotBlank @Size(max = 500) private String featureSectionDescription;
    @NotEmpty @Size(max = 12) private List<@Valid FeatureItem> features;
    @NotBlank @Size(max = 255) private String stepSectionTitle;
    @NotBlank @Size(max = 500) private String stepSectionDescription;
    @NotEmpty @Size(max = 8) private List<@Valid StepItem> steps;
    @NotBlank @Size(max = 255) private String ctaTitle;
    @NotBlank @Size(max = 500) private String ctaDescription;
    @NotBlank @Size(max = 100) private String ctaButtonText;
    @NotBlank @Size(max = 500) private String footerText;
    @Size(max = 100) private Map<String, @Valid TextStyle> textStyles;

    @Data
    public static class FeatureItem {
        @NotBlank @Size(max = 50) private String icon;
        @NotBlank @Size(max = 150) private String title;
        @NotBlank @Size(max = 500) private String description;
    }

    @Data
    public static class StepItem {
        @NotBlank @Size(max = 10) private String number;
        @NotBlank @Size(max = 150) private String title;
        @NotBlank @Size(max = 500) private String description;
    }

    @Data
    public static class TextStyle {
        @Size(max = 20) private String color;
        private Integer fontSize;
        @Size(max = 50) private String fontFamily;
        private Integer fontWeight;
        @Size(max = 20) private String fontStyle;
        @Size(max = 20) private String textDecoration;
        @Size(max = 20) private String textAlign;
        private Double lineHeight;
        private Double letterSpacing;
    }
}
