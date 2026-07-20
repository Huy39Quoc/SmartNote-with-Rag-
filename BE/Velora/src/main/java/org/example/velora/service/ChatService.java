package org.example.velora.service;

import org.example.velora.dto.request.ChatRequest;
import org.example.velora.dto.response.ChatResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface ChatService {
    ChatResponse.SessionDetail createSession(UUID userId, ChatRequest.CreateSession req);
    ChatResponse.AskResult ask(UUID userId, UUID sessionId, ChatRequest.Ask req);
    List<ChatResponse.SessionSummary> getSessions(UUID userId);
    ChatResponse.SessionDetail getSession(UUID userId, UUID sessionId);
    ChatResponse.SessionDetail updateSession(UUID userId, UUID sessionId, ChatRequest.UpdateSession req);
    void deleteSession(UUID userId, UUID sessionId);
    String transcribeVoice(UUID userId, MultipartFile file);
}
