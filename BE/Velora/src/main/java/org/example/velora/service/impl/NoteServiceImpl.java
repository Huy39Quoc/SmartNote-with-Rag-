package org.example.velora.service.impl;

import org.example.velora.dto.PackageValidationDto;
import org.example.velora.dto.request.NoteRequest;
import org.example.velora.dto.response.NoteResponse;
import org.example.velora.entity.Note;
import org.example.velora.entity.NoteShare;
import org.example.velora.entity.Tag;
import org.example.velora.entity.User;
import org.example.velora.exception.BadRequestException;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.mapper.NoteMapper;
import org.example.velora.repository.NoteRepository;
import org.example.velora.repository.NoteShareRepository;
import org.example.velora.repository.TagRepository;
import org.example.velora.repository.UserRepository;
import org.example.velora.service.AiService;
import org.example.velora.service.NoteService;
import org.example.velora.util.ChromaDbClient;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;

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
    private final NoteShareRepository noteShareRepository;

    @Override
    public NoteResponse.Detail create(UUID userId, NoteRequest.Create req) {
        User user = getUser(userId);

        PackageValidationDto.validateMaxNotes(user);

        Note note = Note.builder()
                .user(user).title(req.getTitle()).content(req.getContent()).build();

        if (req.getTagIds() != null && !req.getTagIds().isEmpty()) {
            note.setTags(tagRepository.findAllById(req.getTagIds()));
        }

        note = noteRepository.save(note);
        embedNoteSafely(note);
        return toDetailWithAccess(noteRepository.save(note), userId);
    }

    @Override
    public NoteResponse.Detail update(UUID userId, UUID noteId, NoteRequest.Update req) {
        Note note = getEditableNote(userId, noteId);

        if (StringUtils.hasText(req.getTitle()))  note.setTitle(req.getTitle());
        if (req.getContent() != null) { note.setContent(req.getContent()); note.setIsEmbedded(false); }
        if (req.getTagIds() != null)  note.setTags(tagRepository.findAllById(req.getTagIds()));

        note = noteRepository.save(note);
        embedNoteSafely(note);
        return toDetailWithAccess(noteRepository.save(note), userId);
    }

    @Override
    public void delete(UUID userId, UUID noteId) {
        Note note = getOwnedNote(userId, noteId);
        chromaDbClient.delete(note.getId().toString());
        noteRepository.delete(note);
    }

    @Override
    @Transactional(readOnly = true)
    public NoteResponse.Detail getById(UUID userId, UUID noteId) {
        return toDetailWithAccess(getAccessibleNote(userId, noteId), userId);
    }

    @Override
    @Transactional(readOnly = true)
    public NoteResponse.Page getAll(UUID userId, NoteRequest.Search search) {
        Pageable pageable = PageRequest.of(search.getPage(), search.getSize());
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

        return NoteResponse.Page.builder()
                .content(page.getContent().stream().map(noteMapper::toSummary).toList())
                .pageNumber(page.getNumber()).pageSize(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages()).last(page.isLast()).build();
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
            PackageValidationDto.validateFeatureAccess(user, "CHECKLIST_BASIC");
        }

        PackageValidationDto.validateAiUsage(user, "AI_NOTE_FORMAT", userRepository);
        getEditableNote(userId, noteId);

        NoteResponse.AiResult result = aiService.improveNote(req.getContent(), req.getTitle(), req.getAction());

        PackageValidationDto.incrementAiUsage(user, userRepository);
        return result;
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private void embedNoteSafely(Note note) {
        try {
            String content = "# " + (note.getTitle() != null ? note.getTitle() : "")
                    + "\n\n" + (note.getContent() != null ? note.getContent() : "");
            if (!StringUtils.hasText(content)) { note.setIsEmbedded(false); return; }
            note.setIsEmbedded(chromaDbClient.embed(
                    note.getId().toString(), content,
                    note.getUser().getId().toString(), "note"));
        } catch (Exception e) {
            note.setIsEmbedded(false);
        }
    }

    private Note getOwnedNote(UUID userId, UUID noteId) {
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Ghi chú không tồn tại"));
        if (note.getUser() == null || !note.getUser().getId().equals(userId))
            throw new ResourceNotFoundException("Ghi chú không tồn tại");
        return note;
    }

    private Note getAccessibleNote(UUID userId, UUID noteId) {
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Ghi chú không tồn tại"));
        if (note.getUser() != null && note.getUser().getId().equals(userId)) return note;
        if (noteShareRepository.existsByNoteIdAndSharedWithId(noteId, userId)) return note;
        throw new ResourceNotFoundException("Ghi chú không tồn tại");
    }

    private Note getEditableNote(UUID userId, UUID noteId) {
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Ghi chú không tồn tại"));
        if (note.getUser() != null && note.getUser().getId().equals(userId)) return note;
        NoteShare share = noteShareRepository.findByNoteIdAndSharedWithId(noteId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Ghi chú không tồn tại"));
        if (share.getPermission() != NoteShare.Permission.EDIT)
            throw new BadRequestException("Bạn không có quyền chỉnh sửa ghi chú này");
        return note;
    }

    private User getUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
    }

    private NoteResponse.Detail toDetailWithAccess(Note note, UUID userId) {
        NoteResponse.Detail detail = noteMapper.toDetail(note);
        detail.setAccessMode(resolveAccessMode(note, userId));
        return detail;
    }

    private String resolveAccessMode(Note note, UUID userId) {
        if (note.getUser() != null && note.getUser().getId().equals(userId)) return "OWNER";
        return noteShareRepository.findByNoteIdAndSharedWithId(note.getId(), userId)
                .map(s -> s.getPermission() == NoteShare.Permission.EDIT ? "EDIT" : "VIEW")
                .orElse("VIEW");
    }
}