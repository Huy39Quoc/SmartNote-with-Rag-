package org.example.velora.dto.response;

import org.example.velora.entity.ChatMessage;
import org.example.velora.entity.ChatSession;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class ChatResponse {

    @Data
    @Builder
    public static class SessionSummary {
        private UUID id;
        private String title;
        private ChatSession.ContextType contextType;
        private String lastMessage;
        private LocalDateTime updatedAt;
    }

    @Data
    @Builder
    public static class SessionDetail {
        private UUID id;
        private String title;
        private ChatSession.ContextType contextType;
        private UUID contextId;
        private List<MessageItem> messages;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data
    @Builder
    public static class MessageItem {
        private UUID id;
        private ChatMessage.Role role;
        private String content;
        private List<String> sourceChunks;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    public static class AskResult {
        private MessageItem userMessage;
        private MessageItem assistantMessage;
    }
}
