package org.example.velora.service.impl;

import org.example.velora.client.ChromaDbClient;
import org.example.velora.dto.request.DocumentRequest;
import org.example.velora.dto.response.DocumentResponse;
import org.example.velora.entity.Document;
import org.example.velora.entity.Note;
import org.example.velora.entity.User;
import org.example.velora.exception.BadRequestException;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.repository.DocumentRepository;
import org.example.velora.repository.NoteRepository;
import org.example.velora.repository.UserRepository;
import org.example.velora.service.AiService;
import org.example.velora.service.DocumentService;
import org.example.velora.service.PackageValidationService;
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
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service @RequiredArgsConstructor @Transactional @Slf4j
public class DocumentServiceImpl implements DocumentService {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final NoteRepository noteRepository;
    private final AiService aiService;
    private final ChromaDbClient chromaDbClient;
    private final FileExtractor fileExtractor;
    private final PackageValidationService packageValidationService;
    @Autowired private ApplicationContext applicationContext;

    @Value("${upload.dir}") private String uploadDir;

    // Định dạng audio hỗ trợ
    private static final Set<String> AUDIO_EXTENSIONS = Set.of(
        ".mp3", ".wav", ".m4a", ".webm", ".ogg", ".flac", ".aac"
    );

    @Override
    public DocumentResponse.Summary upload(UUID userId, MultipartFile file) {
        String originalName = file.getOriginalFilename();
        Document.FileType fileType = resolveFileType(originalName);
        String storedName = UUID.randomUUID() + "_" + originalName;
        Path storePath = Paths.get(uploadDir, userId.toString());

        try {
            Files.createDirectories(storePath);
            Files.copy(
                    file.getInputStream(),
                    storePath.resolve(storedName),
                    StandardCopyOption.REPLACE_EXISTING
            );
        } catch (IOException e) {
            throw new BadRequestException("Không thể lưu file: " + e.getMessage());
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));

        packageValidationService.validateStorageLimit(user, file.getSize());

        Document doc = Document.builder()
                .user(user)
                .fileName(storedName)
                .originalName(originalName)
                .fileType(fileType)
                .storagePath(storePath.resolve(storedName).toString())
                .fileSize(file.getSize())
                .status(Document.Status.PENDING)
                .build();

        doc = documentRepository.save(doc);

        UUID docId = doc.getId();

        log.info("Document uploaded and saved: id={}, name={}, type={}",
                docId, originalName, fileType);

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    log.info("Upload transaction committed. Start async processing document: {}", docId);
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
            log.error("Async processing failed: document not found after commit. id={}", docId);
            return;
        }

        doc.setStatus(Document.Status.PROCESSING);
        documentRepository.save(doc);

        log.info("Start processing document: id={}, name={}, type={}",
                doc.getId(), doc.getOriginalName(), doc.getFileType());

        try {
            boolean embedded = false;

            if (doc.getFileType() == Document.FileType.AUDIO) {
                log.info("Transcribing audio document: {}", docId);

                String transcript = aiService.transcribeAudioFile(doc.getStoragePath());
                doc.setAudioTranscript(transcript);

                log.info("Audio transcribed. Start embedding document: {}", docId);

                embedded = chromaDbClient.embed(
                        docId.toString(),
                        transcript,
                        doc.getUser().getId().toString(),
                        "audio"
                );
            } else {
                log.info("Extracting text document: {}", docId);

                String text = fileExtractor.extract(doc.getStoragePath(), doc.getFileType());
                doc.setExtractedText(text);

                log.info("Text extracted. Length={}, Start embedding document: {}",
                        text == null ? 0 : text.length(), docId);

                embedded = chromaDbClient.embed(
                        docId.toString(),
                        text,
                        doc.getUser().getId().toString(),
                        "document"
                );
            }

            doc.setIsEmbedded(embedded);
            doc.setStatus(embedded ? Document.Status.DONE : Document.Status.FAILED);

            log.info("Document processed finished: id={}, status={}, embedded={}",
                    docId, doc.getStatus(), embedded);

        } catch (Exception e) {
            doc.setStatus(Document.Status.FAILED);
            doc.setIsEmbedded(false);

            log.error("Document {} processing failed", docId, e);
        }

        documentRepository.save(doc);
    }

    @Override
    public DocumentResponse.AudioResult transcribeAudio(UUID userId, UUID docId,
                                                        DocumentRequest.TranscribeAudio req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
        packageValidationService.validateAiUsage(user, "AI_AUDIO");

        Document doc = getDoc(userId, docId);
        if (doc.getFileType() != Document.FileType.AUDIO)
            throw new BadRequestException("File này không phải audio");
        if (doc.getStatus() != Document.Status.DONE)
            throw new BadRequestException("Audio chưa xử lý xong (trạng thái: " + doc.getStatus() + ")");

        String raw = doc.getAudioTranscript() != null ? doc.getAudioTranscript()
            : aiService.transcribeAudioFile(doc.getStoragePath());

        // Dùng AI chuyển transcript thô → ghi chú có cấu trúc
        String structured = aiService.structureTranscript(raw, req.getTopic());
        String title = req.getNoteTitle() != null ? req.getNoteTitle()
            : aiService.suggestTitle(structured);

        UUID createdNoteId = null;
        if (Boolean.TRUE.equals(req.getCreateNote())) {
            Note note = Note.builder().user(user).title(title).content(structured).build();
            note = noteRepository.save(note);
            createdNoteId = note.getId();
            // Embed note mới vào ChromaDB
            chromaDbClient.embed(note.getId().toString(), structured,
                userId.toString(), "note");
        }

        packageValidationService.incrementAiUsage(user);

        return DocumentResponse.AudioResult.builder()
            .documentId(docId).rawTranscript(raw)
            .structuredNote(structured).noteTitle(title)
            .createdNoteId(createdNoteId).build();
    }

    @Override
    public DocumentResponse.AnalysisResult analyze(UUID userId, UUID docId,
                                                    DocumentRequest.Analyze req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
        packageValidationService.validateAiUsage(user, "AI_ANALYZE");

        Document doc = getDoc(userId, docId);
        if (doc.getStatus() != Document.Status.DONE)
            throw new BadRequestException("Tài liệu chưa xử lý xong");
        String content = doc.getFileType() == Document.FileType.AUDIO
            ? doc.getAudioTranscript() : doc.getExtractedText();
        if (content == null) throw new BadRequestException("Không có nội dung để phân tích");

        DocumentResponse.AnalysisResult result = aiService.analyzeDocument(content, req.getInstruction());

        packageValidationService.incrementAiUsage(user);

        return result;
    }

    @Override
    public DocumentResponse.AskResult ask(UUID userId, UUID docId, DocumentRequest.Ask req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));

        packageValidationService.validateAiUsage(user, "AI_CHAT");
        Document doc = getDoc(userId, docId);

        if (doc.getStatus() != Document.Status.DONE || !Boolean.TRUE.equals(doc.getIsEmbedded())) {
            throw new BadRequestException("Tài liệu chưa xử lý xong hoặc chưa được embedding");
        }

        List<String> chunks = chromaDbClient.search(
                req.getQuestion(),
                userId.toString(),
                docId.toString()
        );

        String answer = aiService.chatWithContext(req.getQuestion(), chunks);

        user.setAiUsedThisMonth(user.getAiUsedThisMonth() + 1);
        user.setLastAiUsageDate(LocalDateTime.now());
        userRepository.save(user);

        return DocumentResponse.AskResult.builder()
                .answer(answer)
                .sourceParagraphs(chunks)
                .confidence(chunks.isEmpty() ? 0.3 : 0.85)
                .build();
    }

    @Override @Transactional(readOnly = true)
    public DocumentResponse.Page getAll(UUID userId, Pageable pageable) {
        Page<Document> page = documentRepository.findByUserIdOrderByUploadedAtDesc(userId, pageable);
        return DocumentResponse.Page.builder()
            .content(page.getContent().stream().map(this::toSummary).toList())
            .pageNumber(page.getNumber()).pageSize(page.getSize())
            .totalElements(page.getTotalElements())
            .totalPages(page.getTotalPages()).last(page.isLast()).build();
    }

    @Override @Transactional(readOnly = true)
    public DocumentResponse.Detail getById(UUID userId, UUID docId) {
        return toDetail(getDoc(userId, docId));
    }

    @Override
    public void delete(UUID userId, UUID docId) {
        Document doc = getDoc(userId, docId);
        try { Files.deleteIfExists(Paths.get(doc.getStoragePath())); } catch (IOException ignored) {}
        chromaDbClient.delete(docId.toString());
        documentRepository.delete(doc);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private Document getDoc(UUID userId, UUID docId) {
        Document doc = documentRepository.findById(docId)
            .orElseThrow(() -> new ResourceNotFoundException("Tài liệu không tồn tại"));
        if (!doc.getUser().getId().equals(userId))
            throw new ResourceNotFoundException("Tài liệu không tồn tại");
        return doc;
    }

    private Document.FileType resolveFileType(String name) {
        if (name == null) throw new BadRequestException("Tên file không hợp lệ");
        String lower = name.toLowerCase();
        if (lower.endsWith(".pdf"))  return Document.FileType.PDF;
        if (lower.endsWith(".docx")) return Document.FileType.DOCX;
        if (lower.endsWith(".txt"))  return Document.FileType.TXT;
        for (String ext : AUDIO_EXTENSIONS) {
            if (lower.endsWith(ext)) return Document.FileType.AUDIO;
        }
        throw new BadRequestException("Chỉ hỗ trợ PDF, DOCX, TXT, MP3, WAV, M4A, WEBM, OGG");
    }

    private DocumentResponse.Summary toSummary(Document d) {
        return DocumentResponse.Summary.builder()
            .id(d.getId()).originalName(d.getOriginalName()).fileType(d.getFileType())
            .fileSize(d.getFileSize()).status(d.getStatus())
            .isEmbedded(d.getIsEmbedded()).uploadedAt(d.getUploadedAt()).build();
    }

    private DocumentResponse.Detail toDetail(Document d) {
        return DocumentResponse.Detail.builder()
            .id(d.getId()).originalName(d.getOriginalName()).fileType(d.getFileType())
            .fileSize(d.getFileSize()).status(d.getStatus()).isEmbedded(d.getIsEmbedded())
            .aiSummary(d.getAiSummary()).audioTranscript(d.getAudioTranscript())
            .audioDurationSeconds(d.getAudioDurationSeconds())
            .uploadedAt(d.getUploadedAt()).updatedAt(d.getUpdatedAt()).build();
    }
}
