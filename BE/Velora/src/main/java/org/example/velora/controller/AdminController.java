package org.example.velora.controller;

import org.example.velora.dto.request.UserRequest;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.dto.response.UserResponse;
import org.example.velora.entity.SystemPrompt;
import org.example.velora.service.AdminService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController @RequestMapping("/api/admin")
@RequiredArgsConstructor @PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private final AdminService adminService;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<Object>> stats() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getSystemStats()));
    }

    @GetMapping("/ai-stats")
    public ResponseEntity<ApiResponse<Object>> aiStats() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getAiUsageStats()));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<UserResponse.Page>> users(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getUsers(keyword,
            PageRequest.of(page, size, Sort.by("createdAt").descending()))));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<ApiResponse<UserResponse.AdminView>> updateUser(
            @PathVariable UUID id, @RequestBody UserRequest.AdminUpdate req) {
        return ResponseEntity.ok(ApiResponse.ok(adminService.updateUser(id, req)));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable UUID id) {
        adminService.deleteUser(id);
        return ResponseEntity.ok(ApiResponse.ok("Xoá user thành công", null));
    }

    @GetMapping("/prompts")
    public ResponseEntity<ApiResponse<List<SystemPrompt>>> prompts() {
        return ResponseEntity.ok(ApiResponse.ok(adminService.getSystemPrompts()));
    }

    @PutMapping("/prompts/{id}")
    public ResponseEntity<ApiResponse<SystemPrompt>> updatePrompt(
            @PathVariable UUID id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ApiResponse.ok(
            adminService.updateSystemPrompt(id, body.get("promptText"))));
    }

    @PostMapping("/broadcast")
    public ResponseEntity<ApiResponse<Void>> broadcast(@RequestBody BroadcastReq req) {
        adminService.broadcast(req.getTitle(), req.getMessage());
        return ResponseEntity.ok(ApiResponse.ok("Đã gửi thông báo toàn hệ thống", null));
    }

    @Data static class BroadcastReq { private String title; private String message; }
}
