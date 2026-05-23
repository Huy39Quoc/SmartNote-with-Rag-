package org.example.velora.client.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;
import java.util.List;

@Data @Builder
public class LmStudioRequest {
    private String model;
    private List<Message> messages;
    @JsonProperty("max_tokens") private int maxTokens;
    private double temperature;
    private boolean stream;

    @Data @Builder
    public static class Message {
        private String role;
        private String content;
    }
}
