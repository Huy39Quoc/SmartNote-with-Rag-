package org.example.velora.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.velora.dto.request.LandingContentRequest;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.dto.response.LandingContentResponse;
import org.example.velora.service.LandingContentService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class LandingContentController {
    private final LandingContentService service;

    @GetMapping("/api/landing")
    public ResponseEntity<ApiResponse<LandingContentResponse>> published() {
        return ResponseEntity.ok(ApiResponse.ok(service.getPublished()));
    }

    @GetMapping("/api/admin/landing")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<LandingContentResponse>> draft() {
        return ResponseEntity.ok(ApiResponse.ok(service.getDraft()));
    }

    @PutMapping("/api/admin/landing")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<LandingContentResponse>> saveDraft(@Valid @RequestBody LandingContentRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Đã lưu bản nháp", service.saveDraft(request)));
    }

    @PostMapping("/api/admin/landing/publish")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<LandingContentResponse>> publish() {
        return ResponseEntity.ok(ApiResponse.ok("Đã xuất bản Landing Page", service.publish()));
    }
}
