package org.example.velora.service.impl;

import org.example.velora.dto.request.NoteRequest;
import org.example.velora.dto.response.NoteResponse;
import org.example.velora.entity.Note;
import org.example.velora.entity.NoteShare;
import org.example.velora.entity.NoteVersion;
import org.example.velora.entity.User;
import org.example.velora.exception.BadRequestException;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.mapper.NoteMapper;
import org.example.velora.repository.NoteRepository;
import org.example.velora.repository.NoteShareRepository;
import org.example.velora.repository.NoteVersionRepository;
import org.example.velora.repository.TagRepository;
import org.example.velora.repository.UserRepository;
import org.example.velora.security.JwtTokenProvider;
import org.example.velora.service.AiService;
import org.example.velora.service.NoteRealtimeService;
import org.example.velora.service.NoteService;
import org.example.velora.service.UserPackageService;
import org.example.velora.util.ChromaDbClient;
import org.example.velora.util.RichTextContent;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class NoteServiceImpl implements NoteService {

    private static final String FEATURE_CHECKLIST_BASIC = "CHECKLIST_BASIC";
    private static final String FEATURE_AI_NOTE_FORMAT = "AI_NOTE_FORMAT";
    private static final int VERSION_CHECKPOINT_MINUTES = 5;

    private final NoteRepository noteRepository;
    private final TagRepository tagRepository;
    private final UserRepository userRepository;
    private final AiService aiService;
    private final NoteMapper noteMapper;
    private final ChromaDbClient chromaDbClient;
    private final NoteShareRepository noteShareRepository;
    private final NoteVersionRepository noteVersionRepository;
    private final UserPackageService userPackageService;
    private final NoteRealtimeService noteRealtimeService;
    private final JwtTokenProvider jwtTokenProvider;

    @Autowired
    private ApplicationContext applicationContext;

    @Override
    public NoteResponse.Detail create(UUID userId, NoteRequest.Create req) {
        User user = getUser(userId);

        userPackageService.checkMaxNotes(user);

        Note note = Note.builder()
                .user(user)
                .title(req.getTitle())
                .content(RichTextContent.sanitize(req.getContent()))
                .build();

        if (req.getTagIds() != null && !req.getTagIds().isEmpty()) {
            note.setTags(tagRepository.findAllById(req.getTagIds()));
        }

        note = noteRepository.save(note);
        saveVersion(note, user, true);
        scheduleNoteEmbedding(note.getId());

        return toDetailWithAccess(note, userId);
    }

    @Override
    public NoteResponse.Detail update(UUID userId, UUID noteId, NoteRequest.Update req) {
        User editor = getUser(userId);
        Note note = getEditableNote(userId, noteId);
        String oldTitle = note.getTitle();
        String oldContent = note.getContent();

        if (StringUtils.hasText(req.getTitle())) {
            note.setTitle(req.getTitle());
        }

        if (req.getContent() != null) {
            note.setContent(RichTextContent.sanitize(req.getContent()));
            note.setIsEmbedded(false);
        }

        if (req.getTagIds() != null) {
            note.setTags(tagRepository.findAllById(req.getTagIds()));
        }

        note = noteRepository.save(note);
        boolean contentChanged = !Objects.equals(oldTitle, note.getTitle())
                || !Objects.equals(oldContent, note.getContent());

        if (contentChanged) {
            saveVersion(note, editor, false);
            scheduleNoteEmbedding(note.getId());
        }

        NoteResponse.Detail detail = toDetailWithAccess(note, userId);
        publishNoteUpdated(note.getId(), detail, editor, req.getEditorSessionId());

        return detail;
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
            userPackageService.checkFeatureAccess(user, FEATURE_CHECKLIST_BASIC);
        }

        userPackageService.checkAiUsage(user, FEATURE_AI_NOTE_FORMAT);
        getEditableNote(userId, noteId);

        NoteResponse.AiResult result = aiService.improveNote(
                RichTextContent.toPlainText(req.getContent()),
                req.getTitle(),
                req.getAction()
        );

        userPackageService.increaseAiUsage(user);
        return result;
    }

    @Override
    public NoteResponse.DiagramResult generateDiagram(
            UUID userId,
            UUID noteId,
            NoteRequest.GenerateDiagram req
    ) {
        User user = getUser(userId);

        userPackageService.checkAiUsage(user, FEATURE_AI_NOTE_FORMAT);

        Note note = getAccessibleNote(userId, noteId);

        if (req.getDiagramType() == null) {
            throw new BadRequestException("Vui lòng chọn loại sơ đồ.");
        }

        String plainContent = RichTextContent.toPlainText(note.getContent());

        if (!StringUtils.hasText(plainContent)) {
            throw new BadRequestException("Ghi chú không có nội dung để tạo sơ đồ.");
        }

        String diagramCode = aiService.generateDiagramFromNote(
                note.getTitle(),
                plainContent,
                req.getDiagramType()
        );

        userPackageService.increaseAiUsage(user);

        String format = req.getDiagramType() == NoteRequest.GenerateDiagram.DiagramType.SKETCHNOTE
                ? "JSON"
                : "MERMAID";

        return NoteResponse.DiagramResult.builder()
                .noteId(note.getId())
                .noteTitle(note.getTitle())
                .diagramType(req.getDiagramType().name())
                .format(format)
                .diagramCode(diagramCode)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<NoteResponse.Version> getVersions(UUID userId, UUID noteId) {
        getAccessibleNote(userId, noteId);

        return noteVersionRepository.findByNoteIdOrderByVersionNumberDesc(noteId)
                .stream()
                .map(this::toVersionResponse)
                .toList();
    }

    @Override
    public NoteResponse.Detail restoreVersion(UUID userId, UUID noteId, UUID versionId) {
        User editor = getUser(userId);
        Note note = getEditableNote(userId, noteId);
        NoteVersion version = noteVersionRepository.findById(versionId)
                .orElseThrow(() -> new ResourceNotFoundException("Phiên bản không tồn tại"));

        if (version.getNote() == null || !version.getNote().getId().equals(noteId)) {
            throw new ResourceNotFoundException("Phiên bản không tồn tại");
        }

        note.setTitle(version.getTitle());
        note.setContent(RichTextContent.sanitize(version.getContent()));
        note.setIsEmbedded(false);

        note = noteRepository.save(note);
        saveVersion(note, editor, true);
        scheduleNoteEmbedding(note.getId());

        NoteResponse.Detail detail = toDetailWithAccess(note, userId);
        publishNoteUpdated(note.getId(), detail, editor, null);

        return detail;
    }

    @Override
    @Transactional(readOnly = true)
    public SseEmitter subscribeToNote(UUID userId, UUID noteId) {
        getAccessibleNote(userId, noteId);
        return noteRealtimeService.subscribe(noteId);
    }

    @Override
    @Transactional(readOnly = true)
    public SseEmitter subscribeToNote(String token, UUID noteId) {
        if (!StringUtils.hasText(token) || !jwtTokenProvider.validateToken(token)) {
            throw new BadRequestException("Token realtime không hợp lệ");
        }

        String email = jwtTokenProvider.getEmailFromToken(token);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));

        return subscribeToNote(user.getId(), noteId);
    }

    private void saveVersion(Note note, User editor, boolean force) {
        if (!force) {
            NoteVersion latest = noteVersionRepository.findTopByNoteIdOrderByVersionNumberDesc(note.getId())
                    .orElse(null);

            if (latest != null
                    && latest.getCreatedAt() != null
                    && latest.getCreatedAt().isAfter(LocalDateTime.now().minusMinutes(VERSION_CHECKPOINT_MINUTES))) {
                return;
            }
        }

        noteVersionRepository.save(NoteVersion.builder()
                .note(note)
                .editedBy(editor)
                .versionNumber(noteVersionRepository.countByNoteId(note.getId()) + 1)
                .title(note.getTitle())
                .content(note.getContent())
                .build());
    }

    private NoteResponse.Version toVersionResponse(NoteVersion version) {
        User editedBy = version.getEditedBy();

        return NoteResponse.Version.builder()
                .id(version.getId())
                .noteId(version.getNote().getId())
                .versionNumber(version.getVersionNumber())
                .title(version.getTitle())
                .content(RichTextContent.sanitize(version.getContent()))
                .editedByName(editedBy != null ? editedBy.getFullName() : null)
                .editedByEmail(editedBy != null ? editedBy.getEmail() : null)
                .createdAt(version.getCreatedAt())
                .build();
    }

    private void publishNoteUpdated(
            UUID noteId,
            NoteResponse.Detail detail,
            User editor,
            String editorSessionId
    ) {
        noteRealtimeService.publishNoteUpdated(noteId, NoteResponse.RealtimeEvent.builder()
                .type("NOTE_UPDATED")
                .editorSessionId(editorSessionId)
                .updatedByName(editor.getFullName())
                .updatedByEmail(editor.getEmail())
                .note(detail)
                .build());
    }

    private void scheduleNoteEmbedding(UUID noteId) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    applicationContext.getBean(NoteServiceImpl.class).embedNoteAsync(noteId);
                }
            });
        } else {
            applicationContext.getBean(NoteServiceImpl.class).embedNoteAsync(noteId);
        }
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void embedNoteAsync(UUID noteId) {
        Note note = noteRepository.findById(noteId).orElse(null);
        if (note == null) {
            return;
        }

        embedNoteSafely(note);
        noteRepository.save(note);
    }

    private void embedNoteSafely(Note note) {
        try {
            String plainNoteContent = RichTextContent.toPlainText(note.getContent());
            if (!StringUtils.hasText(plainNoteContent)) {
                note.setIsEmbedded(false);
                return;
            }

            String content = "# " + (note.getTitle() != null ? note.getTitle() : "")
                    + "\n\n" + plainNoteContent;

            if (!StringUtils.hasText(content)) {
                note.setIsEmbedded(false);
                return;
            }

            note.setIsEmbedded(chromaDbClient.embed(
                    note.getId().toString(),
                    content,
                    note.getUser().getId().toString(),
                    "note"
            ));
        } catch (Exception e) {
            note.setIsEmbedded(false);
        }
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

    private NoteResponse.Detail toDetailWithAccess(Note note, UUID userId) {
        NoteResponse.Detail detail = noteMapper.toDetail(note);
        detail.setAccessMode(resolveAccessMode(note, userId));
        return detail;
    }

    private String resolveAccessMode(Note note, UUID userId) {
        if (note.getUser() != null && note.getUser().getId().equals(userId)) {
            return "OWNER";
        }

        return noteShareRepository.findByNoteIdAndSharedWithId(note.getId(), userId)
                .map(s -> s.getPermission() == NoteShare.Permission.EDIT ? "EDIT" : "VIEW")
                .orElse("VIEW");
    }
}
