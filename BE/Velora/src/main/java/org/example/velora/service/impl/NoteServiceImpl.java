package org.example.velora.service.impl;

import org.example.velora.dto.request.NoteRequest;
import org.example.velora.dto.response.NoteResponse;
import org.example.velora.entity.Note;
import org.example.velora.entity.NoteShare;
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

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class NoteServiceImpl implements NoteService {

    private static final String FEATURE_CHECKLIST_BASIC = "CHECKLIST_BASIC";
    private static final String FEATURE_AI_NOTE_FORMAT = "AI_NOTE_FORMAT";

    private final NoteRepository noteRepository;
    private final TagRepository tagRepository;
    private final UserRepository userRepository;
    private final AiService aiService;
    private final NoteMapper noteMapper;
    private final ChromaDbClient chromaDbClient;
    private final NoteShareRepository noteShareRepository;
    private final UserPackageService userPackageService;

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
        scheduleNoteEmbedding(note.getId());

        return toDetailWithAccess(note, userId);
    }

    @Override
    public NoteResponse.Detail update(UUID userId, UUID noteId, NoteRequest.Update req) {
        Note note = getEditableNote(userId, noteId);

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
        scheduleNoteEmbedding(note.getId());

        return toDetailWithAccess(note, userId);
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
