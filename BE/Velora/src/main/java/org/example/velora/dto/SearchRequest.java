package org.example.velora.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class SearchRequest {
    private String query;
    private int topK;
    private Map<String, String> filter;
}
