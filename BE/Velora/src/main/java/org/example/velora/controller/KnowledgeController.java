package org.example.velora.controller;

import org.example.velora.dto.request.KnowledgeGroupRequest;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.dto.response.KnowledgeGroupResponse;
import org.example.velora.security.UserDetailsImpl;
import org.example.velora.service.KnowledgeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController @RequestMapping("/api/knowledge") @RequiredArgsConstructor
public class KnowledgeController {
    private final KnowledgeService knowledgeService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<KnowledgeGroupResponse.Summary>>> getAll(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u) {
        return ResponseEntity.ok(ApiResponse.ok(knowledgeService.getAll(u.getUserId())));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<KnowledgeGroupResponse.Detail>> getById(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(knowledgeService.getById(u.getUserId(), id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<KnowledgeGroupResponse.Detail>> create(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @Valid @RequestBody KnowledgeGroupRequest.Create req) {
        return ResponseEntity.ok(ApiResponse.ok(knowledgeService.create(u.getUserId(), req)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<KnowledgeGroupResponse.Detail>> update(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @PathVariable UUID id, @Valid @RequestBody KnowledgeGroupRequest.Update req) {
        return ResponseEntity.ok(ApiResponse.ok(knowledgeService.update(u.getUserId(), id, req)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @PathVariable UUID id) {
        knowledgeService.delete(u.getUserId(), id);
        return ResponseEntity.ok(ApiResponse.ok("Xoá nhóm thành công", null));
    }

    @PostMapping("/classify")
    public ResponseEntity<ApiResponse<KnowledgeGroupResponse.ClassifyResult>> classify(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @Valid @RequestBody KnowledgeGroupRequest.Classify req) {
        return ResponseEntity.ok(ApiResponse.ok(knowledgeService.classifyNote(u.getUserId(), req)));
    }

    @PostMapping("/reclassify")
    public ResponseEntity<ApiResponse<List<KnowledgeGroupResponse.Summary>>> reclassify(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u) {
        return ResponseEntity.ok(ApiResponse.ok(knowledgeService.reclassifyAll(u.getUserId())));
    }
}
