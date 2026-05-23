package org.example.velora.controller;

import org.example.velora.dto.request.TagRequest;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.dto.response.TagResponse;
import org.example.velora.security.UserDetailsImpl;
import org.example.velora.service.TagService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController @RequestMapping("/api/tags") @RequiredArgsConstructor
public class TagController {
    private final TagService tagService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TagResponse.Detail>>> getAll(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u) {
        return ResponseEntity.ok(ApiResponse.ok(tagService.getAll(u.getUserId())));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<TagResponse.Detail>> create(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @Valid @RequestBody TagRequest.Create req) {
        return ResponseEntity.ok(ApiResponse.ok(tagService.create(u.getUserId(), req)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<TagResponse.Detail>> update(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @PathVariable UUID id, @Valid @RequestBody TagRequest.Update req) {
        return ResponseEntity.ok(ApiResponse.ok(tagService.update(u.getUserId(), id, req)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @PathVariable UUID id) {
        tagService.delete(u.getUserId(), id);
        return ResponseEntity.ok(ApiResponse.ok("Xoá tag thành công", null));
    }
}
