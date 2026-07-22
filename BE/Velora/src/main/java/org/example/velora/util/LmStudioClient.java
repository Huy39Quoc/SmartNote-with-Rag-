package org.example.velora.util;

import org.example.velora.dto.LmStudioRequest;
import org.example.velora.dto.LmStudioResponse;
import org.example.velora.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
@RequiredArgsConstructor
public class LmStudioClient {

    private final WebClient lmStudioWebClient;

    @Value("${ai.lm-studio.model}")          private String model;
    @Value("${ai.lm-studio.max-tokens}")     private int maxTokens;
    @Value("${ai.lm-studio.temperature}")    private double temperature;
    @Value("${ai.lm-studio.timeout-seconds:60}") private long timeout;

    public String complete(String userMessage) {
        return chatComplete(
                "Bạn là trợ lý AI hỗ trợ học tập và làm việc. " +
                        "Luôn trả lời bằng tiếng Việt. " +
                        "Trả lời trực tiếp, ngắn gọn, không suy luận dài, không để trống nội dung.",
                userMessage
        );
    }

    public String chatComplete(String systemMessage, String userMessage) {
        LmStudioRequest req = LmStudioRequest.builder()
                .model(model)
                .messages(List.of(
                        LmStudioRequest.Message.builder().role("system").content(systemMessage).build(),
                        LmStudioRequest.Message.builder().role("user").content(userMessage).build()
                ))
                .maxTokens(maxTokens).temperature(temperature).stream(false).build();
        try {

            LmStudioResponse resp = lmStudioWebClient.post()
                    .uri("/v1/chat/completions")
                    .bodyValue(req)
                    .retrieve()
                    .bodyToMono(LmStudioResponse.class)
                    .timeout(Duration.ofSeconds(timeout))
                    .block();
            if (resp != null && resp.getChoices() != null && !resp.getChoices().isEmpty()) {
                String content = resp.getChoices().get(0).getMessage().getContent();
                if (content != null && !content.isBlank()) return content.trim();
            }
            throw new BadRequestException("Model AI không trả về nội dung.");
        } catch (BadRequestException e) {
            throw e;
        } catch (WebClientResponseException e) {
            log.error("LM Studio HTTP {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new BadRequestException("Dịch vụ AI trả về lỗi HTTP " + e.getStatusCode().value() + ".");
        } catch (Exception e) {
            log.error("LM Studio error: {}", e.getMessage());
            throw new BadRequestException("Không thể kết nối dịch vụ AI. Hãy kiểm tra LM Studio và model đang được tải.");
        }
    }

    public String transcribeAudio(String filePath) {
        try {
            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            builder.part("file", new FileSystemResource(filePath));
            builder.part("model", "whisper-1");
            builder.part("language", "vi");
            builder.part("response_format", "text");

            String result = lmStudioWebClient.post()
                    .uri("/v1/audio/transcriptions")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofMinutes(5))
                    .block();
            return result != null ? result.trim() : "";
        } catch (Exception e) {
            log.error("Audio transcription failed: {}", e.getMessage());
            throw new RuntimeException("Transcription failed: " + e.getMessage());
        }
    }

    public List<String> getLoadedModels() {
        try {

            Map<?, ?> resp = lmStudioWebClient.get().uri("/v1/models")
                    .retrieve().bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(5)).block();
            if (resp == null) return List.of();
            List<?> data = (List<?>) resp.get("data");
            if (data == null) return List.of();
            return data.stream().filter(m -> m instanceof Map)
                    .map(m -> (String) ((Map<?, ?>) m).get("id")).toList();
        } catch (Exception e) {
            log.warn("Cannot reach LM Studio: {}", e.getMessage());
            return List.of();
        }
    }
}
