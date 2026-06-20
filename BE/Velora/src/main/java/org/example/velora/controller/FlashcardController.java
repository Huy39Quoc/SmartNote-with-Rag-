package org.example.velora.controller;

import lombok.RequiredArgsConstructor;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.dto.response.FlashcardResponse;
import org.example.velora.entity.Flashcard;
import org.example.velora.entity.Note;
import org.example.velora.repository.FlashcardRepository;
import org.example.velora.repository.NoteRepository;
import org.example.velora.service.impl.AiServiceImpl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/flashcards")
@RequiredArgsConstructor
@CrossOrigin
public class FlashcardController {

    private final NoteRepository noteRepository;
    private final FlashcardRepository flashcardRepository;
    private final AiServiceImpl aiService;

    @PostMapping("/generate/{noteId}")
    @Transactional
    public ResponseEntity<ApiResponse<List<FlashcardResponse>>> generateFlashcards(
            @PathVariable String noteId,
            @AuthenticationPrincipal UserDetails userDetails) {

        String cleanNoteIdStr = noteId.trim();
        UUID uuidNoteId = UUID.fromString(cleanNoteIdStr);
        Note note = noteRepository.findById(uuidNoteId)
                .orElseThrow(() -> new org.example.velora.exception.ResourceNotFoundException("Ghi chú không tồn tại"));

        flashcardRepository.deleteByNoteId(uuidNoteId);

        List<Flashcard> createdCards = aiService.generateFlashcardsFromNote(note);
        List<Flashcard> savedCards = flashcardRepository.saveAll(createdCards);

        List<FlashcardResponse> responseData = savedCards.stream().map(c -> FlashcardResponse.builder()
                .id(c.getId())
                .question(c.getQuestion())
                .answer(c.getAnswer())
                .noteId(c.getNote() != null ? String.valueOf(c.getNote().getId()) : null)
                .createdAt(c.getCreatedAt())
                .build()
        ).collect(Collectors.toList());

        ApiResponse<List<FlashcardResponse>> apiResponse = ApiResponse.<List<FlashcardResponse>>builder()
                .success(true)
                .message("Tạo bộ flashcard thành công")
                .data(responseData)
                .build();

        return ResponseEntity.ok(apiResponse);
    }

    @GetMapping("/note/{noteId}")
    public ResponseEntity<ApiResponse<List<FlashcardResponse>>> getByNote(@PathVariable String noteId) {
        UUID uuidNoteId = UUID.fromString(noteId.trim());
        List<Flashcard> cards = flashcardRepository.findByNoteId(uuidNoteId);

        List<FlashcardResponse> responseData = cards.stream().map(c -> FlashcardResponse.builder()
                .id(c.getId())
                .question(c.getQuestion())
                .answer(c.getAnswer())
                .noteId(c.getNote() != null ? String.valueOf(c.getNote().getId()) : null)
                .createdAt(c.getCreatedAt())
                .build()
        ).collect(Collectors.toList());

        ApiResponse<List<FlashcardResponse>> apiResponse = ApiResponse.<List<FlashcardResponse>>builder()
                .success(true)
                .message("Tải danh sách flashcard thành công")
                .data(responseData)
                .build();

        return ResponseEntity.ok(apiResponse);
    }
}