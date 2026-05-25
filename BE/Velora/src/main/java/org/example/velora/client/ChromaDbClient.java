package org.example.velora.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
@RequiredArgsConstructor
public class ChromaDbClient {

    // ĐÃ ĐỔI TÊN: Thành chromaWebClient để trùng khớp với tên @Bean trong WebClientConfig
    private final WebClient chromaWebClient;
    private final ObjectMapper objectMapper;

    @Value("${ai.chroma.collection-name}")
    private String collection;

    public void embed(String id, String text, String userId, String type) {
        try {
            chromaWebClient.post().uri("/embed")
                    .bodyValue(Map.of("id", id, "text", text,
                            "userId", userId, "type", type, "collection", collection))
                    .retrieve().bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(30)).block();
        } catch (Exception e) {
            log.error("Chroma embed error id={}: {}", id, e.getMessage());
        }
    }

    public List<String> search(String query, String userId, String contextId) {
        try {
            Map<String, Object> body = contextId != null
                    ? Map.of("query", query, "userId", userId,
                    "contextId", contextId, "k", 5, "collection", collection)
                    : Map.of("query", query, "userId", userId, "k", 5, "collection", collection);

            String raw = chromaWebClient.post().uri("/search").bodyValue(body)
                    .retrieve().bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(15)).block();

            if (raw == null) return List.of();
            Map<?, ?> resp = objectMapper.readValue(raw, Map.class);
            List<?> chunks = (List<?>) resp.get("chunks");
            return chunks == null ? List.of() : chunks.stream().map(Object::toString).toList();
        } catch (Exception e) {
            log.error("Chroma search error: {}", e.getMessage());
            return List.of();
        }
    }

    public void delete(String id) {
        try {
            chromaWebClient.method(HttpMethod.DELETE)
                    .uri("/embed/{id}?collection={col}", id, collection)
                    .retrieve().bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(10)).block();
        } catch (Exception e) {
            log.error("Chroma delete error id={}: {}", id, e.getMessage());
        }
    }

    /**
     * Gọi Python Whisper service để nhận dạng giọng nói tiếng Việt
     * Gửi file audio dưới dạng multipart/form-data
     */
    public String transcribeAudio(String filePath, String language) {
        try {
            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            builder.part("file", new FileSystemResource(filePath));
            builder.part("language", language != null ? language : "vi");

            String raw = chromaWebClient.post()
                    .uri("/audio/transcribe")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve().bodyToMono(String.class)
                    .timeout(Duration.ofMinutes(10))  // Audio dài có thể mất vài phút
                    .block();

            if (raw == null) return "";
            Map<?, ?> resp = objectMapper.readValue(raw, Map.class);
            Object value = resp.get("transcript");
            return value != null ? (String) value : "";
        } catch (Exception e) {
            log.error("Whisper transcribe error: {}", e.getMessage());
            throw new RuntimeException("Không thể nhận dạng âm thanh: " + e.getMessage());
        }
    }

    public boolean isHealthy() {
        try {
            chromaWebClient.get().uri("/health").retrieve()
                    .bodyToMono(String.class).timeout(Duration.ofSeconds(3)).block();
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}