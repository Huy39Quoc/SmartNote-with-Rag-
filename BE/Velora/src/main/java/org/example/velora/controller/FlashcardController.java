package org.example.velora.controller;

import lombok.RequiredArgsConstructor;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.dto.response.FlashcardResponse;
import org.example.velora.security.UserDetailsImpl;
import org.example.velora.service.FlashcardService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/flashcards")
@RequiredArgsConstructor
public class FlashcardController {

    private final FlashcardService flashcardService;

    @PostMapping("/generate/{noteId}")
    public ResponseEntity<ApiResponse<List<FlashcardResponse>>> generateFlashcards(
            @PathVariable UUID noteId,
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u) {
        return ResponseEntity.ok(ApiResponse.ok("Tạo bộ flashcard thành công",
                flashcardService.generateFromNote(u.getUserId(), noteId)));
    }

    @PostMapping("/generate-from-document/{documentId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> generateFlashcardsFromDocument(
            @PathVariable UUID documentId,
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u) {
        return ResponseEntity.ok(ApiResponse.ok("Tạo flashcard từ tài liệu thành công",
                flashcardService.generateFromDocument(u.getUserId(), documentId)));
    }

    @GetMapping("/note/{noteId}")
    public ResponseEntity<ApiResponse<List<FlashcardResponse>>> getByNote(
            @PathVariable UUID noteId,
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u) {
        return ResponseEntity.ok(ApiResponse.ok("Tải danh sách flashcard thành công",
                flashcardService.getByNote(u.getUserId(), noteId)));
    }
}
