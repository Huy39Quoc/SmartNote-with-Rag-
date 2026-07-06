package org.example.velora.controller;

import org.example.velora.dto.request.ChatRequest;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.dto.response.ChatResponse;
import org.example.velora.exception.BadRequestException;
import org.example.velora.security.UserDetailsImpl;
import org.example.velora.service.AiService;
import org.example.velora.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController @RequestMapping("/api/chat") @RequiredArgsConstructor
public class ChatController {
    private final ChatService chatService;
    private final AiService aiService;

    @Value("${upload.dir}")
    private String uploadDir;

    @PostMapping("/sessions")
    public ResponseEntity<ApiResponse<ChatResponse.SessionDetail>> createSession(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @RequestBody(required = false) ChatRequest.CreateSession req) {
        if (req == null) req = new ChatRequest.CreateSession();
        return ResponseEntity.ok(ApiResponse.ok(chatService.createSession(u.getUserId(), req)));
    }

    @GetMapping("/sessions")
    public ResponseEntity<ApiResponse<List<ChatResponse.SessionSummary>>> getSessions(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u) {
        return ResponseEntity.ok(ApiResponse.ok(chatService.getSessions(u.getUserId())));
    }

    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<ChatResponse.SessionDetail>> getSession(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @PathVariable UUID sessionId) {
        return ResponseEntity.ok(ApiResponse.ok(chatService.getSession(u.getUserId(), sessionId)));
    }

    @PatchMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<ChatResponse.SessionDetail>> updateSession(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @PathVariable UUID sessionId, @RequestBody ChatRequest.UpdateSession req) {
        return ResponseEntity.ok(ApiResponse.ok(chatService.updateSession(u.getUserId(), sessionId, req)));
    }

    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<ApiResponse<Void>> deleteSession(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @PathVariable UUID sessionId) {
        chatService.deleteSession(u.getUserId(), sessionId);
        return ResponseEntity.ok(ApiResponse.ok("Xoá session thành công", null));
    }

    @PostMapping("/sessions/{sessionId}/ask")
    public ResponseEntity<ApiResponse<ChatResponse.AskResult>> ask(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @PathVariable UUID sessionId, @Valid @RequestBody ChatRequest.Ask req) {
        return ResponseEntity.ok(ApiResponse.ok(chatService.ask(u.getUserId(), sessionId, req)));
    }

    @PostMapping("/transcribe")
    public ResponseEntity<ApiResponse<Map<String, String>>> transcribeVoice(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @RequestParam("file") MultipartFile file
    ) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File ghi âm không hợp lệ");
        }

        String originalName = file.getOriginalFilename();
        String extension = resolveAudioExtension(originalName);
        Path userVoiceDir = Paths.get(uploadDir, "chat-voice", u.getUserId().toString());
        Path audioPath = userVoiceDir.resolve(UUID.randomUUID() + extension);

        try {
            Files.createDirectories(userVoiceDir);
            Files.copy(file.getInputStream(), audioPath, StandardCopyOption.REPLACE_EXISTING);

            String transcript = aiService.transcribeAudioFile(audioPath.toString());
            if (transcript == null || transcript.isBlank()) {
                throw new BadRequestException("Không nhận dạng được nội dung giọng nói");
            }

            return ResponseEntity.ok(ApiResponse.ok(Map.of("transcript", transcript.trim())));
        } catch (IOException e) {
            throw new BadRequestException("Không thể lưu file ghi âm: " + e.getMessage());
        } finally {
            try {
                Files.deleteIfExists(audioPath);
            } catch (IOException ignored) {
            }
        }
    }

    private String resolveAudioExtension(String originalName) {
        if (originalName == null || originalName.isBlank()) return ".webm";

        String lower = originalName.toLowerCase();
        for (String ext : List.of(".webm", ".ogg", ".wav", ".mp3", ".m4a", ".aac", ".flac")) {
            if (lower.endsWith(ext)) return ext;
        }

        return ".webm";
    }
}
