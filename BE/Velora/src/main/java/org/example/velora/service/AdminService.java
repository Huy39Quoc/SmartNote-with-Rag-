package org.example.velora.service;

import org.example.velora.dto.request.PackageServiceRequest;
import org.example.velora.dto.request.UserRequest;
import org.example.velora.dto.response.UserResponse;
import org.example.velora.entity.PackageService;
import org.example.velora.entity.SystemPrompt;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.UUID;

public interface AdminService {
    UserResponse.Page getUsers(String keyword, Pageable pageable);
    UserResponse.AdminView updateUser(UUID userId, UserRequest.AdminUpdate req);
    void deleteUser(UUID userId);
    Object getSystemStats();
    List<SystemPrompt> getSystemPrompts();
    SystemPrompt updateSystemPrompt(UUID promptId, String promptText);
    void broadcast(String title, String message);
    Object getAiUsageStats();
    PackageService createOrUpdatePackage(PackageServiceRequest request);
    List<PackageService> getAllPackages();
    PackageService createPackage(PackageServiceRequest request);
    PackageService updatePackage(UUID id, PackageServiceRequest request);
    void deletePackage(UUID id);
}
