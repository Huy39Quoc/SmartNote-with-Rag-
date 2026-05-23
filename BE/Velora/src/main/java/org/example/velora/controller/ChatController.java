package org.example.velora.controller;

import org.example.velora.dto.request.ChatRequest;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.dto.response.ChatResponse;
import org.example.velora.security.UserDetailsImpl;
import org.example.velora.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController @RequestMapping("/api/chat") @RequiredArgsConstructor
public class ChatController {
    private final ChatService chatService;

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
}
