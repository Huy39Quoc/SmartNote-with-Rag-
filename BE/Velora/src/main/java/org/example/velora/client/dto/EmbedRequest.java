package org.example.velora.client.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class EmbedRequest {
    private String id;
    private String text;
    private Map<String, String> metadata;
}
