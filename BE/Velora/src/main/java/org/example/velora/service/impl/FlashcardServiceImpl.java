package org.example.velora.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.velora.dto.response.FlashcardResponse;
import org.example.velora.entity.Document;
import org.example.velora.entity.Flashcard;
import org.example.velora.entity.Note;
import org.example.velora.entity.User;
import org.example.velora.exception.BadRequestException;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.repository.DocumentRepository;
import org.example.velora.repository.DocumentShareRepository;
import org.example.velora.repository.FlashcardRepository;
import org.example.velora.repository.NoteRepository;
import org.example.velora.repository.UserRepository;
import org.example.velora.service.AiService;
import org.example.velora.service.FlashcardService;
import org.example.velora.service.UserPackageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class FlashcardServiceImpl implements FlashcardService {

    private static final String FEATURE_AI_FLASHCARD = "AI_FLASHCARD";

    private final NoteRepository noteRepository;
    private final FlashcardRepository flashcardRepository;
    private final UserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final DocumentShareRepository documentShareRepository;
    private final AiService aiService;
    private final UserPackageService userPackageService;

    @Override
    public List<FlashcardResponse> generateFromNote(UUID userId, UUID noteId) {
        User user = getUser(userId);
        Note note = ownerOnlyNote(noteId, user);

        userPackageService.checkAiUsage(user, FEATURE_AI_FLASHCARD);

        flashcardRepository.deleteByNoteId(note.getId());

        List<Flashcard> saved = flashcardRepository.saveAll(
                aiService.generateFlashcardsFromNote(note));

        userPackageService.increaseAiUsage(user);

        return saved.stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Override
    public Map<String, Object> generateFromDocument(UUID userId, UUID documentId) {
        User user = getUser(userId);

        userPackageService.checkAiUsage(user, FEATURE_AI_FLASHCARD);

        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Tài liệu không tồn tại"));

        // Cho phép chủ sở hữu, hoặc người được chia sẻ quyền EDIT (nhất quán với
        // quyền hỏi đáp AI / phân tích AI của tài liệu). Người chỉ có quyền VIEW
        // hoặc không liên quan gì tới tài liệu đều bị chặn (404 để không lộ tồn tại).
        boolean isOwner = document.getUser() != null && document.getUser().getId().equals(userId);
        boolean canEdit = !isOwner && documentShareRepository
                .findByDocumentIdAndSharedWithId(documentId, userId)
                .map(s -> s.getPermission() == org.example.velora.entity.DocumentShare.Permission.EDIT)
                .orElse(false);

        if (!isOwner && !canEdit)
            throw new ResourceNotFoundException("Tài liệu không tồn tại");

        if (document.getStatus() != Document.Status.DONE && document.getStatus() != Document.Status.SUCCESS)
            throw new BadRequestException("Tài liệu chưa xử lý xong, chưa thể tạo flashcard");

        String sourceContent = pickContent(document);
        if (sourceContent == null || sourceContent.isBlank())
            throw new BadRequestException("Tài liệu chưa có nội dung để tạo flashcard");

        if (sourceContent.length() > 12000)
            sourceContent = sourceContent.substring(0, 12000);

        Note generatedNote = noteRepository.save(Note.builder()
                .user(user)
                .title(buildNoteTitle(document))
                .content(sourceContent)
                .isBookmarked(false)
                .isEmbedded(false)
                .build());

        List<Flashcard> saved = flashcardRepository.saveAll(
                aiService.generateFlashcardsFromNote(generatedNote));

        userPackageService.increaseAiUsage(user);

        Map<String, Object> data = new HashMap<>();
        data.put("noteId",     generatedNote.getId());
        data.put("documentId", document.getId());
        data.put("total",      saved.size());
        data.put("cards",      saved.stream().map(this::toResponse).collect(Collectors.toList()));
        return data;
    }

    @Override
    @Transactional(readOnly = true)
    public List<FlashcardResponse> getByNote(UUID userId, UUID noteId) {
        User user = getUser(userId);
        Note note = ownerOnlyNote(noteId, user);
        return flashcardRepository.findByNoteId(note.getId())
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private User getUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
    }

    private Note ownerOnlyNote(UUID noteId, User user) {
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Ghi chú không tồn tại"));
        if (note.getUser() == null || !note.getUser().getId().equals(user.getId()))
            throw new ResourceNotFoundException("Ghi chú không tồn tại");
        return note;
    }

    private String pickContent(Document document) {
        if (document.getExtractedText() != null && !document.getExtractedText().isBlank())
            return document.getExtractedText();
        if (document.getAudioTranscript() != null && !document.getAudioTranscript().isBlank())
            return document.getAudioTranscript();
        if (document.getAiSummary() != null && !document.getAiSummary().isBlank())
            return document.getAiSummary();
        return "";
    }

    private String buildNoteTitle(Document document) {
        String name = document.getOriginalName() == null ? "tài liệu" : document.getOriginalName().trim();
        String title = "Flashcard từ tài liệu: " + name;
        return title.length() > 240 ? title.substring(0, 240) : title;
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
