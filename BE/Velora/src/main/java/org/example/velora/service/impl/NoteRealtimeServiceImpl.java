package org.example.velora.service.impl;

import org.example.velora.dto.response.NoteResponse;
import org.example.velora.service.NoteRealtimeService;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class NoteRealtimeServiceImpl implements NoteRealtimeService {

    private static final long TIMEOUT_MS = 30L * 60L * 1000L;

    private final Map<UUID, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    @Override
    public SseEmitter subscribe(UUID noteId) {
        SseEmitter emitter = new SseEmitter(TIMEOUT_MS);

        emitters.computeIfAbsent(noteId, ignored -> new CopyOnWriteArrayList<>()).add(emitter);
        emitter.onCompletion(() -> remove(noteId, emitter));
        emitter.onTimeout(() -> remove(noteId, emitter));
        emitter.onError(error -> remove(noteId, emitter));

        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException e) {
            remove(noteId, emitter);
        }

        return emitter;
    }

    @Override
    public void publishNoteUpdated(UUID noteId, NoteResponse.RealtimeEvent event) {
        List<SseEmitter> noteEmitters = emitters.get(noteId);
        if (noteEmitters == null || noteEmitters.isEmpty()) {
            return;
        }

        for (SseEmitter emitter : noteEmitters) {
            try {
                emitter.send(SseEmitter.event().name("note-updated").data(event));
            } catch (IOException | IllegalStateException e) {
                remove(noteId, emitter);
            }
        }
    }

    private void remove(UUID noteId, SseEmitter emitter) {
        List<SseEmitter> noteEmitters = emitters.get(noteId);
        if (noteEmitters == null) {
            return;
        }

        noteEmitters.remove(emitter);
        if (noteEmitters.isEmpty()) {
            emitters.remove(noteId);
        }
    }
}
