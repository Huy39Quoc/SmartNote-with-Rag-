package org.example.velora.service.impl;

import org.example.velora.dto.request.NoteRequest;
import org.example.velora.dto.response.NoteResponse;
import org.example.velora.entity.Note;
import org.example.velora.entity.Tag;
import org.example.velora.entity.User;
import org.example.velora.exception.BadRequestException;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.mapper.NoteMapper;
import org.example.velora.repository.NoteRepository;
import org.example.velora.repository.TagRepository;
import org.example.velora.repository.UserRepository;
import org.example.velora.service.AiService;
import org.example.velora.service.NoteService;
import lombok.RequiredArgsConstructor;
import org.example.velora.service.PackageValidationService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.example.velora.client.ChromaDbClient;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.example.velora.entity.NoteShare;
import org.example.velora.repository.NoteShareRepository;
@Service
@RequiredArgsConstructor
@Transactional
public class NoteServiceImpl implements NoteService {

    private final NoteRepository noteRepository;
    private final TagRepository tagRepository;
    private final UserRepository userRepository;
    private final AiService aiService;
    private final NoteMapper noteMapper;
    private final ChromaDbClient chromaDbClient;
    private final PackageValidationService packageValidationService;
    private final NoteShareRepository noteShareRepository;

    @Override
    public NoteResponse.Detail create(UUID userId, NoteRequest.Create req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));

        packageValidationService.validateMaxNotes(user);

        Note note = Note.builder()
                .user(user)
                .title(req.getTitle())
                .content(req.getContent())
                .build();

        if (req.getTagIds() != null && !req.getTagIds().isEmpty()) {
            List<Tag> tags = tagRepository.findAllById(req.getTagIds());
            note.setTags(tags);
        }

        note = noteRepository.save(note);

        embedNoteSafely(note);

        return noteMapper.toDetail(noteRepository.save(note));
    }

    @Override
    public NoteResponse.Detail update(UUID userId, UUID noteId, NoteRequest.Update req) {
        Note note = getEditableNote(userId, noteId);

        if (StringUtils.hasText(req.getTitle())) {
            note.setTitle(req.getTitle());
        }

        if (req.getContent() != null) {
            note.setContent(req.getContent());
            note.setIsEmbedded(false);
        }

        if (req.getTagIds() != null) {
            note.setTags(tagRepository.findAllById(req.getTagIds()));
        }

        note = noteRepository.save(note);

        embedNoteSafely(note);

        return noteMapper.toDetail(noteRepository.save(note));
    }

    @Override
    public void delete(UUID userId, UUID noteId) {
        Note note = getOwnedNote(userId, noteId);
        chromaDbClient.delete(note.getId().toString());
        noteRepository.delete(note);
    }

    private void embedNoteSafely(Note note) {
        try {
            String content = buildNoteEmbeddingText(note);
            if (!StringUtils.hasText(content)) {
                note.setIsEmbedded(false);
                return;
            }

            boolean ok = chromaDbClient.embed(
                    note.getId().toString(),
                    content,
                    note.getUser().getId().toString(),
                    "note"
            );

            note.setIsEmbedded(ok);
        } catch (Exception e) {
            note.setIsEmbedded(false);
        }
    }

    private String buildNoteEmbeddingText(Note note) {
        String title = note.getTitle() != null ? note.getTitle() : "";
        String content = note.getContent() != null ? note.getContent() : "";
        return "# " + title + "\n\n" + content;
    }

    @Override
    @Transactional(readOnly = true)
    public NoteResponse.Detail getById(UUID userId, UUID noteId) {
        return noteMapper.toDetail(getAccessibleNote(userId, noteId));
    }

    @Override
    @Transactional(readOnly = true)
    public NoteResponse.Page getAll(UUID userId, NoteRequest.Search search) {
        Pageable pageable = PageRequest.of(
                search.getPage(),
                search.getSize()
        );

        Page<Note> page;

        if (StringUtils.hasText(search.getKeyword())) {
            page = noteRepository.searchByKeyword(userId, search.getKeyword(), pageable);
        } else if (search.getTagIds() != null && !search.getTagIds().isEmpty()) {
            page = noteRepository.findByUserIdAndTagIds(userId, search.getTagIds(), pageable);
        } else if (Boolean.TRUE.equals(search.getIsBookmarked())) {
            page = noteRepository.findByUserIdAndIsBookmarkedTrueOrderByUpdatedAtDesc(userId, pageable);
        } else {
            page = noteRepository.findByUserIdOrderByUpdatedAtDesc(userId, pageable);
        }

        List<NoteResponse.Summary> content = page.getContent().stream()
                .map(noteMapper::toSummary)
                .toList();

        return NoteResponse.Page.builder()
                .content(content)
                .pageNumber(page.getNumber())
                .pageSize(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }

    @Override
    public NoteResponse.Detail toggleBookmark(UUID userId, UUID noteId) {
        Note note = getOwnedNote(userId, noteId);
        note.setIsBookmarked(!note.getIsBookmarked());
        return noteMapper.toDetail(noteRepository.save(note));
    }

    @Override
    public NoteResponse.AiResult improveWithAi(UUID userId, UUID noteId, NoteRequest.AiImprove req) {
        User user = getUser(userId);
        if (req.getAction() == NoteRequest.AiImprove.AiAction.CREATE_CHECKLIST) {
            packageValidationService.validateFeatureAccess(user, "CHECKLIST_BASIC");
        }
        packageValidationService.validateAiUsage(user, "AI_NOTE_FORMAT");
        getEditableNote(userId, noteId);
        NoteResponse.AiResult result = aiService.improveNote(req.getContent(), req.getTitle(), req.getAction());
        packageValidationService.incrementAiUsage(user);

        return result;
    }

    private Note getOwnedNote(UUID userId, UUID noteId) {
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Ghi chú không tồn tại"));

        if (note.getUser() == null || !note.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Ghi chú không tồn tại");
        }

        return note;
    }

    private Note getAccessibleNote(UUID userId, UUID noteId) {
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Ghi chú không tồn tại"));

        if (note.getUser() != null && note.getUser().getId().equals(userId)) {
            return note;
        }

        if (noteShareRepository.existsByNoteIdAndSharedWithId(noteId, userId)) {
            return note;
        }

        throw new ResourceNotFoundException("Ghi chú không tồn tại");
    }

    private Note getEditableNote(UUID userId, UUID noteId) {
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Ghi chú không tồn tại"));

        if (note.getUser() != null && note.getUser().getId().equals(userId)) {
            return note;
        }

        NoteShare share = noteShareRepository.findByNoteIdAndSharedWithId(noteId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Ghi chú không tồn tại"));

        if (share.getPermission() != NoteShare.Permission.EDIT) {
            throw new BadRequestException("Bạn không có quyền chỉnh sửa ghi chú này");
        }

        return note;
    }

    private User getUser(UUID userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
    }
}
