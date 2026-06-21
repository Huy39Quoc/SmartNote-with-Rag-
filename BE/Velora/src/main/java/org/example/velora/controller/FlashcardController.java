package org.example.velora.controller;

import lombok.RequiredArgsConstructor;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.dto.response.FlashcardResponse;
import org.example.velora.entity.Flashcard;
import org.example.velora.entity.Note;
import org.example.velora.entity.User;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.repository.FlashcardRepository;
import org.example.velora.repository.NoteRepository;
import org.example.velora.repository.UserRepository;
import org.example.velora.service.AiService;
import org.example.velora.service.PackageValidationService;
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
    private final UserRepository userRepository;
    private final AiService aiService;
    private final PackageValidationService packageValidationService;

    @PostMapping("/generate/{noteId}")
    @Transactional
    public ResponseEntity<ApiResponse<List<FlashcardResponse>>> generateFlashcards(
            @PathVariable String noteId,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = getCurrentUser(userDetails);
        Note note = getOwnedNote(UUID.fromString(noteId.trim()), user);

        packageValidationService.validateAiUsage(user, "AI_FLASHCARD");

        flashcardRepository.deleteByNoteId(note.getId());

        List<Flashcard> createdCards = aiService.generateFlashcardsFromNote(note);
        List<Flashcard> savedCards = flashcardRepository.saveAll(createdCards);

        packageValidationService.incrementAiUsage(user);

        return ResponseEntity.ok(
                ApiResponse.ok("Tạo bộ flashcard thành công",
                        savedCards.stream().map(this::toResponse).collect(Collectors.toList()))
        );
    }

    @GetMapping("/note/{noteId}")
    public ResponseEntity<ApiResponse<List<FlashcardResponse>>> getByNote(
            @PathVariable String noteId,
            @AuthenticationPrincipal UserDetails userDetails) {

        User user = getCurrentUser(userDetails);
        Note note = getOwnedNote(UUID.fromString(noteId.trim()), user);

        List<Flashcard> cards = flashcardRepository.findByNoteId(note.getId());

        return ResponseEntity.ok(
                ApiResponse.ok("Tải danh sách flashcard thành công",
                        cards.stream().map(this::toResponse).collect(Collectors.toList()))
        );
    }

    private User getCurrentUser(UserDetails userDetails) {
        return userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
    }

    private Note getOwnedNote(UUID noteId, User user) {
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Ghi chú không tồn tại"));

        if (note.getUser() == null || !note.getUser().getId().equals(user.getId())) {
            throw new ResourceNotFoundException("Ghi chú không tồn tại");
        }

        return note;
    }

    private FlashcardResponse toResponse(Flashcard c) {
        return FlashcardResponse.builder()
                .id(c.getId())
                .question(c.getQuestion())
                .answer(c.getAnswer())
                .noteId(c.getNote() != null ? String.valueOf(c.getNote().getId()) : null)
                .createdAt(c.getCreatedAt())
                .build();
    }
}