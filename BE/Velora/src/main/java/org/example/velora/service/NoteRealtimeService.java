package org.example.velora.service;

import org.example.velora.dto.response.NoteResponse;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

public interface NoteRealtimeService {

    SseEmitter subscribe(UUID noteId);

    void publishNoteUpdated(UUID noteId, NoteResponse.RealtimeEvent event);
}
