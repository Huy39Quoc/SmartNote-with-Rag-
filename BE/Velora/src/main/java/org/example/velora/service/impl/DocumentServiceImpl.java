package org.example.velora.service.impl;

import org.example.velora.util.ChromaDbClient;
import org.example.velora.dto.request.DocumentRequest;
import org.example.velora.dto.response.DocumentResponse;
import org.example.velora.entity.Document;
import org.example.velora.entity.Note;
import org.example.velora.entity.User;
import org.example.velora.exception.BadRequestException;
import org.example.velora.exception.ResourceNotFoundException;
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

        Document doc = ownerOnly(userId, docId);

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

        Document doc = ownerOnly(userId, docId);

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

        return result;
    }

    @Override
    public DocumentResponse.AskResult ask(UUID userId, UUID docId, DocumentRequest.Ask req) {
        User user = getUser(userId);
        userPackageService.checkAiUsage(user, FEATURE_AI_CHAT);

        Document doc = ownerOnly(userId, docId);

        if (doc.getStatus() != Document.Status.DONE || !Boolean.TRUE.equals(doc.getIsEmbedded())) {
            throw new BadRequestException("Tài liệu chưa xử lý xong hoặc chưa được embedding");
        }

        List<String> chunks = chromaDbClient.search(req.getQuestion(), userId.toString(), docId.toString());
        String answer = aiService.chatWithContext(req.getQuestion(), chunks);

        userPackageService.increaseAiUsage(user);

        return DocumentResponse.AskResult.builder()
                .answer(answer)
                .sourceParagraphs(chunks)
                .confidence(chunks.isEmpty() ? 0.3 : 0.85)
                .build();
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
        // Các thao tác phá hủy (delete, analyze, ask) vẫn giữ nguyên ownerOnly().
        return toDetail(accessibleDocument(userId, docId));
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