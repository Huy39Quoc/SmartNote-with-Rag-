package org.example.velora.controller;

import org.example.velora.client.ChromaDbClient;
import org.example.velora.client.LmStudioClient;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
public class HealthController {

    private final LmStudioClient lmStudioClient;
    private final ChromaDbClient chromaDbClient;
    private final UserRepository userRepository;

    @GetMapping
    public ApiResponse<Map<String, Object>> health() {
        Map<String, Object> status = new LinkedHashMap<>();

        // 1. Backend
        status.put("backend", "UP");

        // 2. Database SQL Server
        try {
            long userCount = userRepository.count();
            status.put("database", "UP - " + userCount + " người dùng");
        } catch (Exception e) {
            log.error("DB health check failed: {}", e.getMessage(), e);
            status.put("database", "DOWN - " + e.getMessage());
        }

        // 3. LM Studio
        try {
            var models = lmStudioClient.getLoadedModels();
            status.put("lmStudio", models.isEmpty()
                ? "DOWN - Chưa load model nào"
                : "UP - Models: " + models);
        } catch (Exception e) {
            status.put("lmStudio", "DOWN - " + e.getMessage());
        }

        // 4. Python AI Service (ChromaDB + Whisper)
        try {
            boolean ok = chromaDbClient.isHealthy();
            status.put("aiService", ok ? "UP" : "DOWN - Không kết nối được Python service");
        } catch (Exception e) {
            status.put("aiService", "DOWN - " + e.getMessage());
        }

        return ApiResponse.ok(status);
    }
}
