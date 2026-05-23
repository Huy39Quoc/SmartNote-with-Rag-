package org.example.velora.controller;

import org.example.velora.client.ChromaDbClient;
import org.example.velora.client.LmStudioClient;
import org.example.velora.dto.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
public class HealthController {

    private final LmStudioClient lmStudioClient;
    private final ChromaDbClient chromaDbClient;

    @GetMapping
    public ApiResponse<Map<String, Object>> health() {
        List<String> models = lmStudioClient.getLoadedModels();
        boolean chromaOk = chromaDbClient.isHealthy();
        return ApiResponse.ok(Map.of(
            "backend",    "UP",
            "lmStudio",   models.isEmpty() ? "DOWN (no model loaded)" : "UP - models: " + models,
            "chromaDB",   chromaOk ? "UP" : "DOWN",
            "lmModels",   models
        ));
    }
}
