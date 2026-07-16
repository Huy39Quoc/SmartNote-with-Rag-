package org.example.velora.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.velora.repository.UserRepository;
import org.example.velora.service.HealthService;
import org.example.velora.util.ChromaDbClient;
import org.example.velora.util.LmStudioClient;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class HealthServiceImpl implements HealthService {

    private final LmStudioClient lmStudioClient;
    private final ChromaDbClient chromaDbClient;
    private final UserRepository userRepository;

    @Override
    public Map<String, Object> getHealthStatus() {
        Map<String, Object> status = new LinkedHashMap<>();

        status.put("backend", "UP");

        try {
            long userCount = userRepository.count();
            status.put("database", "UP - " + userCount + " người dùng");
        } catch (Exception e) {
            log.error("DB health check failed: {}", e.getMessage(), e);
            status.put("database", "DOWN - " + e.getMessage());
        }

        try {
            var models = lmStudioClient.getLoadedModels();
            status.put("lmStudio", models.isEmpty()
                    ? "DOWN - Chưa load model nào"
                    : "UP - Models: " + models);
        } catch (Exception e) {
            status.put("lmStudio", "DOWN - " + e.getMessage());
        }

        try {
            boolean ok = chromaDbClient.isHealthy();
            status.put("aiService", ok ? "UP" : "DOWN - Không kết nối được Python service");
        } catch (Exception e) {
            status.put("aiService", "DOWN - " + e.getMessage());
        }

        return status;
    }
}
