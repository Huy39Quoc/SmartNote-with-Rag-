package org.example.velora.service;

import org.example.velora.dto.request.DocumentRequest;
import org.example.velora.dto.response.DocumentResponse;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;

public interface DocumentService {
    DocumentResponse.Summary upload(UUID userId, MultipartFile file);
    DocumentResponse.AudioResult transcribeAudio(UUID userId, UUID docId, DocumentRequest.TranscribeAudio req);
    DocumentResponse.AnalysisResult analyze(UUID userId, UUID docId, DocumentRequest.Analyze req);
    DocumentResponse.AskResult ask(UUID userId, UUID docId, DocumentRequest.Ask req);
    DocumentResponse.Page getAll(UUID userId, Pageable pageable);
    DocumentResponse.Detail getById(UUID userId, UUID docId);
    void delete(UUID userId, UUID docId);
    DocumentResponse.Summary reprocess(UUID userId, UUID docId);
    org.springframework.core.io.Resource loadFileResource(UUID userId, UUID docId);
}
