package org.example.velora.controller;

import org.example.velora.dto.request.DocumentRequest;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.dto.response.DocumentResponse;
import org.example.velora.security.UserDetailsImpl;
import org.example.velora.service.DocumentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.UUID;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    /**
     * Upload file: PDF, DOCX, TXT, hoặc Audio (mp3, wav, m4a, webm, ogg)
     * FE gửi multipart/form-data với key "file"
     */
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<DocumentResponse.Summary>> upload(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(ApiResponse.ok("Upload thành công, đang xử lý...",
            documentService.upload(u.getUserId(), file)));
    }

    /**
     * Lấy kết quả transcript + ghi chú từ file audio đã upload
     * Có thể tự động tạo Note từ transcript nếu createNote=true
     */
    @PostMapping("/{id}/transcribe")
    public ResponseEntity<ApiResponse<DocumentResponse.AudioResult>> transcribe(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @PathVariable UUID id,
            @RequestBody(required = false) DocumentRequest.TranscribeAudio req) {
        if (req == null) req = new DocumentRequest.TranscribeAudio();
        return ResponseEntity.ok(ApiResponse.ok(
            documentService.transcribeAudio(u.getUserId(), id, req)));
    }

    @PostMapping("/{id}/analyze")
    public ResponseEntity<ApiResponse<DocumentResponse.AnalysisResult>> analyze(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @PathVariable UUID id,
            @RequestBody(required = false) DocumentRequest.Analyze req) {
        if (req == null) req = new DocumentRequest.Analyze();
        return ResponseEntity.ok(ApiResponse.ok(
            documentService.analyze(u.getUserId(), id, req)));
    }

    @PostMapping("/{id}/ask")
    public ResponseEntity<ApiResponse<DocumentResponse.AskResult>> ask(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @PathVariable UUID id,
            @Valid @RequestBody DocumentRequest.Ask req) {
        return ResponseEntity.ok(ApiResponse.ok(
            documentService.ask(u.getUserId(), id, req)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<DocumentResponse.Page>> getAll(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(documentService.getAll(u.getUserId(),
            PageRequest.of(page, size, Sort.by("uploadedAt").descending()))));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DocumentResponse.Detail>> getById(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(documentService.getById(u.getUserId(), id)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @PathVariable UUID id) {
        documentService.delete(u.getUserId(), id);
        return ResponseEntity.ok(ApiResponse.ok("Xoá tài liệu thành công", null));
    }
}
