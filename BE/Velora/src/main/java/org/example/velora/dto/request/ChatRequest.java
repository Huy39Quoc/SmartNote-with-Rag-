package org.example.velora.dto.request;

import org.example.velora.entity.ChatSession;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

public class ChatRequest {

    @Data
    public static class CreateSession {
        private String title;

        private ChatSession.ContextType contextType = ChatSession.ContextType.NOTES;

        private UUID contextId;
    }

    @Data
    public static class Ask {
        @NotBlank(message = "Câu hỏi không được để trống")
        private String message;
    }

    @Data
    public static class UpdateSession {
        private String title;
    }
}
