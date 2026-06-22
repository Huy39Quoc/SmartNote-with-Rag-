package org.example.velora.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class SearchResponse {
    private List<Result> results;

    @Data
    public static class Result {
        private String id;
        private String text;
        private Map<String, String> metadata;
        private double score;
    }
}
