package org.example.velora.config;

import org.example.velora.service.NoteCollaborationHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class NoteCollaborationWebSocketConfig implements WebSocketConfigurer {

    private final NoteCollaborationHandler noteCollaborationHandler;

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(noteCollaborationHandler, "/api/notes/{noteId}/collab")
                .setAllowedOriginPatterns("*");
    }
}
