package org.example.velora.service;

import org.example.velora.dto.request.NoteRequest;
import org.example.velora.dto.response.NoteResponse;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.UUID;

public interface NoteService {

    NoteResponse.Detail create(UUID userId, NoteRequest.Create req);

    NoteResponse.Detail update(UUID userId, UUID noteId, NoteRequest.Update req);

    void delete(UUID userId, UUID noteId);

    NoteResponse.Detail getById(UUID userId, UUID noteId);

    NoteResponse.Page getAll(UUID userId, NoteRequest.Search search);

    NoteResponse.Detail toggleBookmark(UUID userId, UUID noteId);

    NoteResponse.AiResult improveWithAi(UUID userId, UUID noteId, NoteRequest.AiImprove req);

    NoteResponse.DiagramResult generateDiagram(
            UUID userId,
            UUID noteId,
            NoteRequest.GenerateDiagram req
    );

    List<NoteResponse.Version> getVersions(UUID userId, UUID noteId);

    NoteResponse.Detail restoreVersion(UUID userId, UUID noteId, UUID versionId);

    SseEmitter subscribeToNote(UUID userId, UUID noteId);

    SseEmitter subscribeToNote(String token, UUID noteId);
}
