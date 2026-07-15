package org.example.velora.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebConfig {

    @Bean("lmStudioWebClient")
    public WebClient lmStudioWebClient(@Value("${ai.lm-studio.base-url}") String baseUrl) {
        return WebClient.builder()
            .baseUrl(baseUrl)
            .defaultHeader("Content-Type", "application/json")

            .codecs(c -> c.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
            .build();
    }

    @Bean("chromaWebClient")
    public WebClient chromaWebClient(@Value("${ai.chroma.base-url}") String baseUrl) {
        return WebClient.builder()
            .baseUrl(baseUrl)

            .codecs(c -> c.defaultCodecs().maxInMemorySize(200 * 1024 * 1024))
            .build();
    }
}
