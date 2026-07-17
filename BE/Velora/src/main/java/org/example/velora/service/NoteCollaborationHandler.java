package org.example.velora.service;

import org.example.velora.entity.NoteShare;
import org.springframework.web.socket.WebSocketHandler;

import java.util.UUID;

public interface NoteCollaborationHandler extends WebSocketHandler {

    void updateUserPermission(UUID noteId, UUID userId, NoteShare.Permission permission);

    void closeUserSessions(UUID noteId, UUID userId);
}
