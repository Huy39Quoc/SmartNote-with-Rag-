package org.example.velora.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.example.velora.dto.request.LandingContentRequest;
import org.example.velora.dto.response.LandingContentResponse;
import org.example.velora.entity.LandingContent;
import org.example.velora.exception.BadRequestException;
import org.example.velora.repository.LandingContentRepository;
import org.example.velora.service.LandingContentService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Safelist;

import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class LandingContentServiceImpl implements LandingContentService {
    private final LandingContentRepository repository;
    private final ObjectMapper objectMapper;

    @Override
    public LandingContentResponse getPublished() {
        return toResponse(getOrCreate(LandingContent.Status.PUBLISHED));
    }

    @Override
    public LandingContentResponse getDraft() {
        return toResponse(getOrCreate(LandingContent.Status.DRAFT));
    }

    @Override
    public LandingContentResponse saveDraft(LandingContentRequest request) {
        LandingContent draft = getOrCreate(LandingContent.Status.DRAFT);
        applyRequest(draft, request);
        return toResponse(repository.save(draft));
    }

    @Override
    public LandingContentResponse publish() {
        LandingContent draft = getOrCreate(LandingContent.Status.DRAFT);
        LandingContent published = getOrCreate(LandingContent.Status.PUBLISHED);
        copyContent(draft, published);
        return toResponse(repository.save(published));
    }

    private LandingContent getOrCreate(LandingContent.Status status) {
        return repository.findByStatus(status).orElseGet(() -> {
            LandingContent content = defaultContent(status);
            if (status == LandingContent.Status.DRAFT) {
                repository.findByStatus(LandingContent.Status.PUBLISHED)
                    .ifPresent(published -> copyContent(published, content));
            }
            return repository.save(content);
        });
    }

    private LandingContent defaultContent(LandingContent.Status status) {
        LandingContentRequest request = new LandingContentRequest();
        request.setHeroBadge("AI chạy hoàn toàn local · Dữ liệu bảo mật tuyệt đối");
        request.setHeroTitle("Ghi chú thông minh");
        request.setHeroHighlight("bằng sức mạnh AI");
        request.setHeroDescription("Velora giúp sinh viên và người đi làm ghi chú, tổ chức kiến thức, quản lý deadline và hỏi đáp với tài liệu — tất cả nhờ AI chạy local, không lo lộ dữ liệu.");
        request.setPrimaryButtonText("Dùng thử miễn phí");
        request.setSecondaryButtonText("Đăng nhập");
        request.setFeatureSectionTitle("Đầy đủ tính năng");
        request.setFeatureSectionDescription("Mọi thứ bạn cần để học tập và làm việc hiệu quả hơn");
        request.setFeatures(List.of(
            feature("sparkles", "AI ghi chú thông minh", "Tự động tóm tắt, cải thiện cấu trúc và đề xuất tiêu đề cho ghi chú của bạn."),
            feature("upload", "Upload tài liệu & phân tích", "Tải lên PDF, DOCX, TXT — AI đọc và trả lời câu hỏi về nội dung tài liệu."),
            feature("microphone", "Ghi âm & phân tích", "Upload file audio, nhận dạng tiếng Việt và tạo ghi chú có cấu trúc."),
            feature("messages", "Hỏi đáp với ghi chú", "Đặt câu hỏi về nội dung trong kho ghi chú và tài liệu của bạn."),
            feature("calendar", "Quản lý deadline thông minh", "AI tự động phát hiện deadline và sắp xếp theo mức độ ưu tiên."),
            feature("sitemap", "Tổ chức kiến thức tự động", "AI phân loại ghi chú theo chủ đề và gợi ý liên kết giữa các nội dung.")
        ));
        request.setStepSectionTitle("Cách hoạt động");
        request.setStepSectionDescription("Bắt đầu trong vài phút");
        request.setSteps(List.of(
            step("01", "Tạo tài khoản", "Đăng ký miễn phí, không cần thẻ tín dụng."),
            step("02", "Ghi chú hoặc upload", "Tạo ghi chú, tải lên tài liệu hoặc ghi âm bài giảng."),
            step("03", "Để AI làm phần còn lại", "Tóm tắt, phân tích và hỏi đáp với nội dung của bạn.")
        ));
        request.setCtaTitle("Sẵn sàng bắt đầu?");
        request.setCtaDescription("Đăng ký ngay — hoàn toàn miễn phí, không yêu cầu thẻ tín dụng");
        request.setCtaButtonText("Tạo tài khoản miễn phí");
        request.setFooterText("© 2026 Velora · SmartNote with AI");
        request.setTextStyles(Map.of());

        LandingContent content = LandingContent.builder().status(status).build();
        applyRequest(content, request);
        return content;
    }

    private LandingContentRequest.FeatureItem feature(String icon, String title, String description) {
        LandingContentRequest.FeatureItem item = new LandingContentRequest.FeatureItem();
        item.setIcon(icon); item.setTitle(title); item.setDescription(description);
        return item;
    }

    private LandingContentRequest.StepItem step(String number, String title, String description) {
        LandingContentRequest.StepItem item = new LandingContentRequest.StepItem();
        item.setNumber(number); item.setTitle(title); item.setDescription(description);
        return item;
    }

    private void applyRequest(LandingContent target, LandingContentRequest request) {
        target.setHeroBadge(sanitizeRichText(request.getHeroBadge()));
        target.setHeroTitle(sanitizeRichText(request.getHeroTitle()));
        target.setHeroHighlight(sanitizeRichText(request.getHeroHighlight()));
        target.setHeroDescription(sanitizeRichText(request.getHeroDescription()));
        target.setPrimaryButtonText(sanitizeRichText(request.getPrimaryButtonText()));
        target.setSecondaryButtonText(sanitizeRichText(request.getSecondaryButtonText()));
        target.setFeatureSectionTitle(sanitizeRichText(request.getFeatureSectionTitle()));
        target.setFeatureSectionDescription(sanitizeRichText(request.getFeatureSectionDescription()));
        request.getFeatures().forEach(item -> {
            item.setTitle(sanitizeRichText(item.getTitle()));
            item.setDescription(sanitizeRichText(item.getDescription()));
        });
        target.setFeaturesJson(writeJson(request.getFeatures()));
        target.setStepSectionTitle(sanitizeRichText(request.getStepSectionTitle()));
        target.setStepSectionDescription(sanitizeRichText(request.getStepSectionDescription()));
        request.getSteps().forEach(item -> {
            item.setNumber(sanitizeRichText(item.getNumber()));
            item.setTitle(sanitizeRichText(item.getTitle()));
            item.setDescription(sanitizeRichText(item.getDescription()));
        });
        target.setStepsJson(writeJson(request.getSteps()));
        target.setCtaTitle(sanitizeRichText(request.getCtaTitle()));
        target.setCtaDescription(sanitizeRichText(request.getCtaDescription()));
        target.setCtaButtonText(sanitizeRichText(request.getCtaButtonText()));
        target.setFooterText(sanitizeRichText(request.getFooterText()));
        validateStyles(request.getTextStyles());
        target.setTextStylesJson(writeJson(request.getTextStyles() == null ? Map.of() : request.getTextStyles()));
    }

    private void copyContent(LandingContent source, LandingContent target) {
        target.setHeroBadge(source.getHeroBadge());
        target.setHeroTitle(source.getHeroTitle());
        target.setHeroHighlight(source.getHeroHighlight());
        target.setHeroDescription(source.getHeroDescription());
        target.setPrimaryButtonText(source.getPrimaryButtonText());
        target.setSecondaryButtonText(source.getSecondaryButtonText());
        target.setFeatureSectionTitle(source.getFeatureSectionTitle());
        target.setFeatureSectionDescription(source.getFeatureSectionDescription());
        target.setFeaturesJson(source.getFeaturesJson());
        target.setStepSectionTitle(source.getStepSectionTitle());
        target.setStepSectionDescription(source.getStepSectionDescription());
        target.setStepsJson(source.getStepsJson());
        target.setCtaTitle(source.getCtaTitle());
        target.setCtaDescription(source.getCtaDescription());
        target.setCtaButtonText(source.getCtaButtonText());
        target.setFooterText(source.getFooterText());
        target.setTextStylesJson(source.getTextStylesJson());
    }

    private LandingContentResponse toResponse(LandingContent content) {
        return LandingContentResponse.builder()
            .status(content.getStatus().name())
            .heroBadge(content.getHeroBadge()).heroTitle(content.getHeroTitle())
            .heroHighlight(content.getHeroHighlight()).heroDescription(content.getHeroDescription())
            .primaryButtonText(content.getPrimaryButtonText()).secondaryButtonText(content.getSecondaryButtonText())
            .featureSectionTitle(content.getFeatureSectionTitle()).featureSectionDescription(content.getFeatureSectionDescription())
            .features(readJson(content.getFeaturesJson(), new TypeReference<>() {}))
            .stepSectionTitle(content.getStepSectionTitle()).stepSectionDescription(content.getStepSectionDescription())
            .steps(readJson(content.getStepsJson(), new TypeReference<>() {}))
            .ctaTitle(content.getCtaTitle()).ctaDescription(content.getCtaDescription())
            .ctaButtonText(content.getCtaButtonText()).footerText(content.getFooterText())
            .textStyles(content.getTextStylesJson() == null || content.getTextStylesJson().isBlank()
                ? Map.of() : readJson(content.getTextStylesJson(), new TypeReference<>() {}))
            .updatedAt(content.getUpdatedAt()).build();
    }

    private void validateStyles(Map<String, LandingContentRequest.TextStyle> styles) {
        if (styles == null) return;
        Set<String> fonts = Set.of("Inter", "Arial", "Georgia", "Times New Roman", "Verdana", "Tahoma", "Courier New");
        Set<String> aligns = Set.of("left", "center", "right");
        for (LandingContentRequest.TextStyle style : styles.values()) {
            if (style.getFontSize() != null && (style.getFontSize() < 10 || style.getFontSize() > 96))
                throw new BadRequestException("Cỡ chữ phải từ 10 đến 96px");
            if (style.getFontFamily() != null && !fonts.contains(style.getFontFamily()))
                throw new BadRequestException("Font chữ không được hỗ trợ");
            if (style.getTextAlign() != null && !aligns.contains(style.getTextAlign()))
                throw new BadRequestException("Căn lề không hợp lệ");
            if (style.getLineHeight() != null && (style.getLineHeight() < 0.8 || style.getLineHeight() > 3))
                throw new BadRequestException("Chiều cao dòng phải từ 0.8 đến 3");
            if (style.getLetterSpacing() != null && (style.getLetterSpacing() < -3 || style.getLetterSpacing() > 20))
                throw new BadRequestException("Khoảng cách chữ phải từ -3 đến 20px");
            if (style.getColor() != null && !style.getColor().matches("^#[0-9a-fA-F]{6}$"))
                throw new BadRequestException("Màu chữ phải có định dạng #RRGGBB");
        }
    }

    private String sanitizeRichText(String input) {
        Safelist safelist = Safelist.none()
            .addTags("span", "b", "strong", "i", "em", "u", "div", "br")
            .addAttributes("span", "style")
            .addAttributes("div", "style");
        String cleaned = Jsoup.clean(input == null ? "" : input, safelist);
        Document document = Jsoup.parseBodyFragment(cleaned);
        for (Element element : document.select("[style]")) {
            StringBuilder safeStyle = new StringBuilder();
            for (String declaration : element.attr("style").split(";")) {
                String[] pair = declaration.split(":", 2);
                if (pair.length != 2) continue;
                String property = pair[0].trim().toLowerCase();
                String value = pair[1].trim();
                boolean allowed = switch (property) {
                    case "color" -> value.matches("(?i)^(#[0-9a-f]{3,8}|rgb\\([0-9 ,]+\\))$");
                    case "font-size" -> value.matches("^(?:[1-9][0-9]?|100)px$");
                    case "font-family" -> value.matches("(?i)^[a-z0-9 ,'-]{1,60}$");
                    case "font-weight" -> value.matches("^(normal|bold|[1-9]00)$");
                    case "font-style" -> value.matches("^(normal|italic)$");
                    case "text-decoration", "text-align" -> value.matches("^[a-z -]{1,30}$");
                    case "line-height" -> value.matches("^[0-3](?:\\.[0-9]+)?$");
                    case "letter-spacing" -> value.matches("^-?[0-9]+(?:\\.[0-9]+)?px$");
                    default -> false;
                };
                if (allowed) safeStyle.append(property).append(':').append(value).append(';');
            }
            if (safeStyle.isEmpty()) element.removeAttr("style");
            else element.attr("style", safeStyle.toString());
        }
        return document.body().html();
    }

    private String writeJson(Object value) {
        try { return objectMapper.writeValueAsString(value); }
        catch (JsonProcessingException e) { throw new BadRequestException("Nội dung Landing không hợp lệ"); }
    }

    private <T> T readJson(String json, TypeReference<T> type) {
        try { return objectMapper.readValue(json, type); }
        catch (JsonProcessingException e) { throw new BadRequestException("Không thể đọc nội dung Landing"); }
    }
}
