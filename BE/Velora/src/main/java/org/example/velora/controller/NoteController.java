package org.example.velora.controller;

import org.example.velora.dto.request.NoteRequest;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.dto.response.NoteResponse;
import org.example.velora.security.UserDetailsImpl;
import org.example.velora.service.NoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController @RequestMapping("/api/notes") @RequiredArgsConstructor
public class NoteController {
    private final NoteService noteService;

    @PostMapping
    public ResponseEntity<ApiResponse<NoteResponse.Detail>> create(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @Valid @RequestBody NoteRequest.Create req) {
        return ResponseEntity.ok(ApiResponse.ok(noteService.create(u.getUserId(), req)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<NoteResponse.Page>> getAll(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @ModelAttribute NoteRequest.Search search) {
        return ResponseEntity.ok(ApiResponse.ok(noteService.getAll(u.getUserId(), search)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<NoteResponse.Detail>> getById(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(noteService.getById(u.getUserId(), id)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<NoteResponse.Detail>> update(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @PathVariable UUID id, @Valid @RequestBody NoteRequest.Update req) {
        return ResponseEntity.ok(ApiResponse.ok(noteService.update(u.getUserId(), id, req)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @PathVariable UUID id) {
        noteService.delete(u.getUserId(), id);
        return ResponseEntity.ok(ApiResponse.ok("Xoá ghi chú thành công", null));
    }

    @PatchMapping("/{id}/bookmark")
    public ResponseEntity<ApiResponse<NoteResponse.Detail>> bookmark(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(noteService.toggleBookmark(u.getUserId(), id)));
    }

    @PostMapping("/{id}/ai")
    public ResponseEntity<ApiResponse<NoteResponse.AiResult>> ai(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @PathVariable UUID id, @Valid @RequestBody NoteRequest.AiImprove req) {
        return ResponseEntity.ok(ApiResponse.ok(noteService.improveWithAi(u.getUserId(), id, req)));
    }
}
