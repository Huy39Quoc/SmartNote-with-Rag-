package org.example.velora.service.impl;

import org.example.velora.util.ChromaDbClient;
import org.example.velora.dto.request.DocumentRequest;
import org.example.velora.dto.response.DocumentResponse;
import org.example.velora.entity.Document;
import org.example.velora.entity.DocumentChatMessage;
import org.example.velora.entity.Note;
import org.example.velora.entity.User;
import org.example.velora.exception.BadRequestException;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.repository.DocumentChatMessageRepository;
import org.example.velora.repository.DocumentRepository;
import org.example.velora.repository.DocumentShareRepository;
import org.example.velora.repository.NoteRepository;
import org.example.velora.repository.UserRepository;
import org.example.velora.service.AiService;
import org.example.velora.service.DocumentService;
import org.example.velora.service.UserPackageService;
import org.example.velora.util.FileExtractor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationContext;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.io.IOException;
import java.nio.file.*;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class DocumentServiceImpl implements DocumentService {

    private static final String FEATURE_AI_AUDIO = "AI_AUDIO";
    private static final String FEATURE_AI_ANALYZE = "AI_ANALYZE";
    private static final String FEATURE_AI_CHAT = "AI_CHAT";

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final NoteRepository noteRepository;
    private final AiService aiService;
    private final ChromaDbClient chromaDbClient;
    private final FileExtractor fileExtractor;
    private final DocumentShareRepository documentShareRepository;
    private final DocumentChatMessageRepository documentChatMessageRepository;
    private final UserPackageService userPackageService;

    @Autowired
    private ApplicationContext applicationContext;

    @Value("${upload.dir}") private String uploadDir;

    private static final Set<String> AUDIO_EXTENSIONS = Set.of(
            ".mp3", ".wav", ".m4a", ".webm", ".ogg", ".flac", ".aac"
    );

    @Override
    public DocumentResponse.Summary upload(UUID userId, MultipartFile file) {
        User user = getUser(userId);

        userPackageService.checkStorageLimit(user, file.getSize());

        String originalName = file.getOriginalFilename();
        Document.FileType fileType = resolveFileType(originalName);
        String storedName = UUID.randomUUID() + "_" + originalName;
        Path storePath = Paths.get(uploadDir, userId.toString());

        try {
            Files.createDirectories(storePath);
            Files.copy(file.getInputStream(), storePath.resolve(storedName),
                    StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new BadRequestException("Không thể lưu file: " + e.getMessage());
        }

        Document doc = documentRepository.save(Document.builder()
                .user(user)
                .fileName(storedName)
                .originalName(originalName)
                .fileType(fileType)
                .storagePath(storePath.resolve(storedName).toString())
                .fileSize(file.getSize())
                .status(Document.Status.PENDING)
                .build());

        UUID docId = doc.getId();
        log.info("Document uploaded: id={}, name={}, type={}", docId, originalName, fileType);

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    applicationContext.getBean(DocumentServiceImpl.class).processAsync(docId);
                }
            });
        } else {
            applicationContext.getBean(DocumentServiceImpl.class).processAsync(docId);
        }

        return toSummary(doc);
    }

    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void processAsync(UUID docId) {
        Document doc = documentRepository.findById(docId).orElse(null);
        if (doc == null) {
            log.error("Async processing: document not found id={}", docId);
            return;
        }

        doc.setStatus(Document.Status.PROCESSING);
        documentRepository.save(doc);

        try {
            boolean embedded;

            if (doc.getFileType() == Document.FileType.AUDIO) {
                String transcript = aiService.transcribeAudioFile(doc.getStoragePath());

                if (transcript == null
                        || transcript.isBlank()
                        || transcript.contains("Whisper")
                        || transcript.contains("cài đặt Whisper")
                        || transcript.contains("Cần cài Whisper")) {
                    throw new BadRequestException("Transcribe audio thất bại, không lưu transcript fallback.");
                }

                doc.setAudioTranscript(transcript);
                embedded = chromaDbClient.embed(
                        docId.toString(),
                        transcript,
                        doc.getUser().getId().toString(),
                        "audio"
                );
            } else {
                String text = fileExtractor.extract(doc.getStoragePath(), doc.getFileType());
                doc.setExtractedText(text);
                log.info("Text extracted length={} for doc={}", text == null ? 0 : text.length(), docId);
                embedded = chromaDbClient.embed(
                        docId.toString(),
                        text,
                        doc.getUser().getId().toString(),
                        "document"
                );
            }

            doc.setIsEmbedded(embedded);
            doc.setStatus(embedded ? Document.Status.DONE : Document.Status.FAILED);
            log.info("Document processed: id={}, status={}, embedded={}", docId, doc.getStatus(), embedded);

        } catch (Exception e) {
            doc.setStatus(Document.Status.FAILED);
            doc.setIsEmbedded(false);
            log.error("Document {} processing failed", docId, e);
        }

        documentRepository.save(doc);
    }

    @Override
    public DocumentResponse.AudioResult transcribeAudio(
            UUID userId,
            UUID docId,
            DocumentRequest.TranscribeAudio req
    ) {
        User user = getUser(userId);
        userPackageService.checkAiUsage(user, FEATURE_AI_AUDIO);

        Document doc = accessibleDocument(userId, docId);
        requireCanOperate(userId, doc);

        if (doc.getFileType() != Document.FileType.AUDIO) {
            throw new BadRequestException("File này không phải audio");
        }

        if (doc.getStatus() != Document.Status.DONE) {
            throw new BadRequestException("Audio chưa xử lý xong (trạng thái: " + doc.getStatus() + ")");
        }

        String raw = doc.getAudioTranscript();

        if (raw == null
                || raw.isBlank()
                || raw.contains("Whisper")
                || raw.contains("cài đặt Whisper")
                || raw.contains("Cần cài Whisper")) {
            raw = aiService.transcribeAudioFile(doc.getStoragePath());
            doc.setAudioTranscript(raw);
            documentRepository.save(doc);
        }

        String structured = aiService.structureTranscript(raw, req.getTopic());

        String title = doc.getOriginalName();
        if (title == null || title.isBlank()) {
            title = doc.getFileName();
        }

        UUID createdNoteId = null;
        if (Boolean.TRUE.equals(req.getCreateNote())) {
            Note note = noteRepository.save(
                    Note.builder()
                            .user(user)
                            .title(title)
                            .content(structured)
                            .build()
            );

            chromaDbClient.embed(note.getId().toString(), structured, userId.toString(), "note");
            createdNoteId = note.getId();
        }

        userPackageService.increaseAiUsage(user);

        return DocumentResponse.AudioResult.builder()
                .documentId(docId)
                .rawTranscript(raw)
                .structuredNote(structured)
                .noteTitle(title)
                .createdNoteId(createdNoteId)
                .build();
    }

    @Override
    public DocumentResponse.AnalysisResult analyze(
            UUID userId,
            UUID docId,
            DocumentRequest.Analyze req
    ) {
        User user = getUser(userId);
        userPackageService.checkAiUsage(user, FEATURE_AI_ANALYZE);

        Document doc = accessibleDocument(userId, docId);
        requireCanOperate(userId, doc);

        if (doc.getStatus() != Document.Status.DONE) {
            throw new BadRequestException("Tài liệu chưa xử lý xong");
        }

        String content = doc.getFileType() == Document.FileType.AUDIO
                ? doc.getAudioTranscript()
                : doc.getExtractedText();

        if (content == null) {
            throw new BadRequestException("Không có nội dung để phân tích");
        }

        DocumentResponse.AnalysisResult result = aiService.analyzeDocument(content, req.getInstruction());
        userPackageService.increaseAiUsage(user);

        // Lưu lại kết quả phân tích vào tài liệu -> mọi người có quyền xem
        // (kể cả người được chia sẻ) đều thấy lại được, không cần phân tích lại mỗi lần mở.
        StringBuilder combined = new StringBuilder(result.getSummary() == null ? "" : result.getSummary());
        if (result.getKeyPoints() != null && !result.getKeyPoints().isEmpty()) {
            combined.append("\n\nÝ chính:\n");
            result.getKeyPoints().forEach(p -> combined.append("- ").append(p).append("\n"));
        }
        doc.setAiSummary(combined.toString().trim());
        documentRepository.save(doc);

        return result;
    }

    private void requireCanOperate(UUID userId, Document doc) {
        if ("VIEW".equals(resolvePermission(userId, doc))) {
            throw new BadRequestException("Bạn chỉ có quyền xem tài liệu này. Nhờ chủ sở hữu đổi quyền thành \"Có thể chỉnh sửa\" để dùng tính năng này.");
        }
    }

    @Override
    public DocumentResponse.AskResult ask(UUID userId, UUID docId, DocumentRequest.Ask req) {
        User user = getUser(userId);
        userPackageService.checkAiUsage(user, FEATURE_AI_CHAT);

        Document doc = accessibleDocument(userId, docId);

        // Khung chat hỏi đáp AI của tài liệu giờ được CHIA SẺ thật sự: người
        // được chia sẻ quyền EDIT có thể cùng đặt câu hỏi (không chỉ chủ sở
        // hữu như trước đây); quyền VIEW chỉ được đọc lại lịch sử, không hỏi mới.
        requireCanOperate(userId, doc);

        if (doc.getStatus() != Document.Status.DONE || !Boolean.TRUE.equals(doc.getIsEmbedded())) {
            throw new BadRequestException("Tài liệu chưa xử lý xong hoặc chưa được embedding");
        }

        List<String> chunks = chromaDbClient.search(req.getQuestion(), doc.getUser().getId().toString(), docId.toString());
        String answer = aiService.chatWithContext(req.getQuestion(), chunks);

        userPackageService.increaseAiUsage(user);

        documentChatMessageRepository.save(DocumentChatMessage.builder()
                .document(doc).user(user).role(DocumentChatMessage.Role.USER)
                .content(req.getQuestion()).build());
        documentChatMessageRepository.save(DocumentChatMessage.builder()
                .document(doc).user(user).role(DocumentChatMessage.Role.ASSISTANT)
                .content(answer).build());

        return DocumentResponse.AskResult.builder()
                .answer(answer)
                .sourceParagraphs(chunks)
                .confidence(chunks.isEmpty() ? 0.3 : 0.85)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentResponse.ChatHistory getChatHistory(UUID userId, UUID docId) {
        Document doc = accessibleDocument(userId, docId);
        String permission = resolvePermission(userId, doc);

        List<DocumentResponse.ChatMessage> messages = documentChatMessageRepository
                .findByDocumentIdOrderByCreatedAtAsc(docId)
                .stream()
                .map(m -> DocumentResponse.ChatMessage.builder()
                        .id(m.getId())
                        .role(m.getRole().name())
                        .content(m.getContent())
                        .senderId(m.getUser() != null ? m.getUser().getId() : null)
                        .senderName(m.getUser() != null ? m.getUser().getFullName() : null)
                        .createdAt(m.getCreatedAt())
                        .build())
                .toList();

        return DocumentResponse.ChatHistory.builder()
                .messages(messages)
                .canAsk(!"VIEW".equals(permission))
                .build();
    }

    @Override
    public void clearChatHistory(UUID userId, UUID docId) {
        // Chỉ chủ sở hữu được xoá lịch sử chat chung, tránh 1 người được chia
        // sẻ vô tình xoá mất hội thoại của cả nhóm.
        ownerOnly(userId, docId);
        documentChatMessageRepository.deleteByDocumentId(docId);
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentResponse.Page getAll(UUID userId, Pageable pageable) {
        Page<Document> page = documentRepository.findByUserIdOrderByUploadedAtDesc(userId, pageable);
        return DocumentResponse.Page.builder()
                .content(page.getContent().stream().map(this::toSummary).toList())
                .pageNumber(page.getNumber())
                .pageSize(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentResponse.Detail getById(UUID userId, UUID docId) {
        // Cho phép cả owner lẫn người được chia sẻ (VIEW/EDIT) xem chi tiết.
        // Thao tác phá hủy (delete) vẫn giữ nguyên ownerOnly(); ask()/chat giờ
        // cho phép người được chia sẻ quyền EDIT cùng hỏi đáp AI với tài liệu.
        Document doc = accessibleDocument(userId, docId);
        DocumentResponse.Detail detail = toDetail(doc);
        detail.setMyPermission(resolvePermission(userId, doc));
        return detail;
    }

    private String resolvePermission(UUID userId, Document doc) {
        if (doc.getUser() != null && doc.getUser().getId().equals(userId)) {
            return "OWNER";
        }

        return documentShareRepository.findByDocumentIdAndSharedWithId(doc.getId(), userId)
                .map(s -> s.getPermission().name())
                .orElse("VIEW");
    }

    @Override
    public void delete(UUID userId, UUID docId) {
        Document doc = ownerOnly(userId, docId);

        try {
            Files.deleteIfExists(Paths.get(doc.getStoragePath()));
        } catch (IOException ignored) {
        }

        chromaDbClient.delete(docId.toString());
        documentRepository.delete(doc);
    }

    @Override
    @Transactional(readOnly = true)
    public org.springframework.core.io.Resource loadFileResource(UUID userId, UUID docId) {
        Document doc = accessibleDocument(userId, docId);

        try {
            java.nio.file.Path path = Paths.get(doc.getStoragePath());
            org.springframework.core.io.Resource resource = new org.springframework.core.io.UrlResource(path.toUri());

            if (!resource.exists() || !resource.isReadable()) {
                throw new ResourceNotFoundException("File tài liệu không còn tồn tại trên máy chủ");
            }

            return resource;
        } catch (java.net.MalformedURLException e) {
            throw new ResourceNotFoundException("Không thể đọc file tài liệu");
        }
    }

    private Document accessibleDocument(UUID userId, UUID docId) {
        Document doc = documentRepository.findById(docId)
                .orElseThrow(() -> new ResourceNotFoundException("Tài liệu không tồn tại"));

        if (doc.getUser() != null && doc.getUser().getId().equals(userId)) {
            return doc;
        }

        boolean shared = documentShareRepository.existsByDocumentIdAndSharedWithId(docId, userId);

        if (!shared) {
            throw new ResourceNotFoundException("Tài liệu không tồn tại");
        }

        return doc;
    }

    @Override
    public DocumentResponse.Summary reprocess(UUID userId, UUID docId) {
        Document doc = ownerOnly(userId, docId);

        if (doc.getStatus() == Document.Status.PROCESSING) {
            throw new BadRequestException("Tài liệu đang được xử lý, vui lòng đợi");
        }

        doc.setStatus(Document.Status.PENDING);
        doc.setIsEmbedded(false);
        documentRepository.save(doc);

        log.info("Document reprocess requested: id={}", docId);

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    applicationContext.getBean(DocumentServiceImpl.class).processAsync(docId);
                }
            });
        } else {
            applicationContext.getBean(DocumentServiceImpl.class).processAsync(docId);
        }

        return toSummary(doc);
    }

    private Document ownerOnly(UUID userId, UUID docId) {
        Document doc = documentRepository.findById(docId)
                .orElseThrow(() -> new ResourceNotFoundException("Tài liệu không tồn tại"));

        if (!doc.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Tài liệu không tồn tại");
        }

        return doc;
    }

    private User getUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
    }

    private Document.FileType resolveFileType(String name) {
        if (name == null) {
            throw new BadRequestException("Tên file không hợp lệ");
        }

        String lower = name.toLowerCase();

        if (lower.endsWith(".pdf")) {
            return Document.FileType.PDF;
        }

        if (lower.endsWith(".docx")) {
            return Document.FileType.DOCX;
        }

        if (lower.endsWith(".txt")) {
            return Document.FileType.TXT;
        }

        for (String ext : AUDIO_EXTENSIONS) {
            if (lower.endsWith(ext)) {
                return Document.FileType.AUDIO;
            }
        }

        throw new BadRequestException("Chỉ hỗ trợ PDF, DOCX, TXT, MP3, WAV, M4A, WEBM, OGG");
    }

    private DocumentResponse.Summary toSummary(Document d) {
        return DocumentResponse.Summary.builder()
                .id(d.getId())
                .originalName(d.getOriginalName())
                .fileType(d.getFileType())
                .fileSize(d.getFileSize())
                .status(d.getStatus())
                .isEmbedded(d.getIsEmbedded())
                .uploadedAt(d.getUploadedAt())
                .build();
    }

    private DocumentResponse.Detail toDetail(Document d) {
        return DocumentResponse.Detail.builder()
                .id(d.getId())
                .originalName(d.getOriginalName())
                .fileType(d.getFileType())
                .fileSize(d.getFileSize())
                .status(d.getStatus())
                .isEmbedded(d.getIsEmbedded())
                .aiSummary(d.getAiSummary())
                .audioTranscript(d.getAudioTranscript())
                .audioDurationSeconds(d.getAudioDurationSeconds())
                .uploadedAt(d.getUploadedAt())
                .updatedAt(d.getUpdatedAt())
                .build();
    }
}