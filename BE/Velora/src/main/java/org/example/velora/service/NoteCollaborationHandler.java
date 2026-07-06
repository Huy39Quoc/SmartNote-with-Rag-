package org.example.velora.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.example.velora.entity.Note;
import org.example.velora.entity.NoteShare;
import org.example.velora.entity.User;
import org.example.velora.repository.NoteRepository;
import org.example.velora.repository.NoteShareRepository;
import org.example.velora.repository.UserRepository;
import org.example.velora.security.JwtTokenProvider;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
@RequiredArgsConstructor
public class NoteCollaborationHandler extends TextWebSocketHandler {

    private static final int MAX_UPDATE_HISTORY_SIZE = 5000;
    private static final int MAX_UPDATE_BYTES = 1024 * 1024;

    private final ObjectMapper objectMapper;
    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository userRepository;
    private final NoteRepository noteRepository;
    private final NoteShareRepository noteShareRepository;

    private final Map<UUID, NoteRoom> rooms = new ConcurrentHashMap<>();
    private final Map<String, SessionInfo> sessions = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        ConnectionRequest request = parseConnectionRequest(session.getUri());

        if (request == null) {
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        User user = userRepository.findByEmail(request.email()).orElse(null);
        Note note = noteRepository.findById(request.noteId()).orElse(null);

        if (user == null || note == null || !canAccess(note.getId(), user.getId())) {
            session.close(CloseStatus.NOT_ACCEPTABLE.withReason("No access"));
            return;
        }

        boolean canEdit = canEdit(note.getId(), user.getId());
        NoteRoom room = rooms.computeIfAbsent(note.getId(), ignored -> NoteRoom.from(note));

        room.sessions.add(session);
        sessions.put(session.getId(), new SessionInfo(
                note.getId(),
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                canEdit
        ));

        send(session, Map.of(
                "type", "init",
                "title", room.title,
                "content", room.content,
                "updates", List.copyOf(room.updates),
                "seeded", room.seeded,
                "shouldSeed", !room.seeded && canEdit,
                "canEdit", canEdit,
                "sessionId", session.getId()
        ));
        broadcastPresence(room);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        SessionInfo info = sessions.get(session.getId());

        if (info == null) {
            session.close(CloseStatus.NOT_ACCEPTABLE.withReason("No access"));
            return;
        }

        JsonNode json = objectMapper.readTree(message.getPayload());
        String type = json.path("type").asText();
        if ("presence-update".equals(type)) {
            updatePresence(session, info, json);
            return;
        }

        if (!"yjs-update".equals(type) && !"yjs-seed".equals(type)) {
            return;
        }

        if (!info.canEdit || !canEdit(info.noteId, info.userId)) {
            session.close(CloseStatus.NOT_ACCEPTABLE.withReason("No edit access"));
            return;
        }

        String update = json.path("update").asText("");
        String clientId = json.path("clientId").asText("");

        if (!StringUtils.hasText(update) || !StringUtils.hasText(clientId) || !isValidBase64Update(update)) {
            return;
        }

        NoteRoom room = rooms.get(info.noteId);
        if (room == null) {
            return;
        }

        boolean resetClients = false;
        synchronized (room) {
            if ("yjs-seed".equals(type)) {
                if (room.seeded) {
                    return;
                }

                room.seeded = true;
                resetClients = true;
            } else if (!room.seeded) {
                room.seeded = true;
            }

            room.updates.add(update);
            if (room.updates.size() > MAX_UPDATE_HISTORY_SIZE) {
                room.updates.remove(0);
            }
        }

        broadcast(room, Map.of(
                "type", "yjs-update",
                "update", update,
                "reset", resetClients,
                "clientId", clientId,
                "userId", String.valueOf(info.userId)
        ));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        SessionInfo info = sessions.remove(session.getId());
        if (info == null) {
            return;
        }

        NoteRoom room = rooms.get(info.noteId);
        if (room == null) {
            return;
        }

        room.sessions.remove(session);
        broadcastPresence(room);
        if (room.sessions.isEmpty() && room.updates.isEmpty()) {
            rooms.remove(info.noteId);
        }
    }

    public void updateUserPermission(UUID noteId, UUID userId, NoteShare.Permission permission) {
        boolean canEdit = permission == NoteShare.Permission.EDIT;

        for (Map.Entry<String, SessionInfo> entry : sessions.entrySet()) {
            SessionInfo info = entry.getValue();
            if (!info.noteId.equals(noteId) || !info.userId.equals(userId)) {
                continue;
            }

            info.canEdit = canEdit;
            WebSocketSession session = findSession(noteId, entry.getKey());
            if (session == null || !session.isOpen()) {
                continue;
            }

            try {
                send(session, Map.of(
                        "type", "permission-updated",
                        "canEdit", canEdit,
                        "accessMode", canEdit ? "EDIT" : "VIEW"
                ));
            } catch (IOException e) {
                closeQuietly(session, CloseStatus.SERVER_ERROR);
            }
        }
    }

    public void closeUserSessions(UUID noteId, UUID userId) {
        for (Map.Entry<String, SessionInfo> entry : sessions.entrySet()) {
            SessionInfo info = entry.getValue();
            if (!info.noteId.equals(noteId) || !info.userId.equals(userId)) {
                continue;
            }

            WebSocketSession session = findSession(noteId, entry.getKey());
            if (session != null) {
                closeQuietly(session, CloseStatus.NORMAL.withReason("Share revoked"));
            }
        }
    }

    private ConnectionRequest parseConnectionRequest(URI uri) {
        if (uri == null) {
            return null;
        }

        List<String> segments = uri.getPath() == null
                ? List.of()
                : List.of(uri.getPath().split("/"));

        int noteIndex = segments.indexOf("notes") + 1;
        if (noteIndex <= 0 || noteIndex >= segments.size()) {
            return null;
        }

        String token = UriComponentsBuilder.fromUri(uri).build().getQueryParams().getFirst("token");
        if (!StringUtils.hasText(token) || !jwtTokenProvider.validateToken(token)) {
            return null;
        }

        try {
            return new ConnectionRequest(
                    UUID.fromString(segments.get(noteIndex)),
                    jwtTokenProvider.getEmailFromToken(token)
            );
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private boolean canAccess(UUID noteId, UUID userId) {
        return noteRepository.existsByIdAndUserId(noteId, userId)
                || noteShareRepository.existsByNoteIdAndSharedWithId(noteId, userId);
    }

    private boolean canEdit(UUID noteId, UUID userId) {
        if (noteRepository.existsByIdAndUserId(noteId, userId)) {
            return true;
        }

        return noteShareRepository.findByNoteIdAndSharedWithId(noteId, userId)
                .map(share -> share.getPermission() == NoteShare.Permission.EDIT)
                .orElse(false);
    }

    private boolean isValidBase64Update(String update) {
        try {
            return Base64.getDecoder().decode(update).length <= MAX_UPDATE_BYTES;
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    private void broadcast(NoteRoom room, Map<String, ?> payload) {
        String json;
        try {
            json = objectMapper.writeValueAsString(payload);
        } catch (IOException e) {
            return;
        }

        for (WebSocketSession session : room.sessions) {
            if (!session.isOpen()) {
                continue;
            }

            try {
                session.sendMessage(new TextMessage(json));
            } catch (IOException e) {
                closeQuietly(session, CloseStatus.SERVER_ERROR);
            }
        }
    }

    private void updatePresence(WebSocketSession session, SessionInfo info, JsonNode json) {
        NoteRoom room = rooms.get(info.noteId);
        if (room == null) {
            return;
        }

        int maxPosition = json.path("maxPosition").asInt(0);
        int from = clamp(json.path("from").asInt(0), 0, maxPosition);
        int to = clamp(json.path("to").asInt(from), 0, maxPosition);
        String nextClientId = json.path("clientId").asText(info.clientId);
        boolean shouldRefreshParticipants = !StringUtils.hasText(info.clientId)
                || !info.clientId.equals(nextClientId);

        info.clientId = nextClientId;
        info.from = from;
        info.to = to;
        info.active = json.path("active").asBoolean(true);

        if (shouldRefreshParticipants) {
            broadcastPresence(room);
        }

        broadcast(room, Map.of(
                "type", "presence-cursor",
                "participant", participantPayload(session.getId())
        ));
    }

    private void broadcastPresence(NoteRoom room) {
        broadcast(room, Map.of(
                "type", "presence-list",
                "participants", room.sessions.stream()
                        .map(session -> participantPayload(session.getId()))
                        .filter(payload -> !payload.isEmpty())
                        .toList()
        ));
    }

    private Map<String, Object> participantPayload(String sessionId) {
        SessionInfo info = sessions.get(sessionId);
        if (info == null) {
            return Map.of();
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("sessionId", sessionId);
        payload.put("clientId", info.clientId);
        payload.put("userId", String.valueOf(info.userId));
        payload.put("email", info.email);
        payload.put("fullName", StringUtils.hasText(info.fullName) ? info.fullName : info.email);
        payload.put("canEdit", info.canEdit);
        payload.put("from", info.from);
        payload.put("to", info.to);
        payload.put("active", info.active);
        return payload;
    }

    private int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(value, max));
    }

    private void send(WebSocketSession session, Map<String, ?> payload) throws IOException {
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(payload)));
    }

    private WebSocketSession findSession(UUID noteId, String sessionId) {
        NoteRoom room = rooms.get(noteId);
        if (room == null) {
            return null;
        }

        return room.sessions.stream()
                .filter(session -> session.getId().equals(sessionId))
                .findFirst()
                .orElse(null);
    }

    private void closeQuietly(WebSocketSession session, CloseStatus status) {
        try {
            session.close(status);
        } catch (IOException ignored) {
        }
    }

    private record ConnectionRequest(UUID noteId, String email) {
    }

    private static class SessionInfo {
        private final UUID noteId;
        private final UUID userId;
        private final String email;
        private final String fullName;
        private boolean canEdit;
        private String clientId = "";
        private int from = 0;
        private int to = 0;
        private boolean active = true;

        private SessionInfo(UUID noteId, UUID userId, String email, String fullName, boolean canEdit) {
            this.noteId = noteId;
            this.userId = userId;
            this.email = email;
            this.fullName = fullName;
            this.canEdit = canEdit;
        }
    }

    @Data
    private static class NoteRoom {
        private String title = "";
        private String content = "";
        private boolean seeded = false;
        private final List<String> updates = new ArrayList<>();
        private final List<WebSocketSession> sessions = new CopyOnWriteArrayList<>();

        static NoteRoom from(Note note) {
            NoteRoom room = new NoteRoom();
            room.title = note.getTitle() == null ? "" : note.getTitle();
            room.content = note.getContent() == null ? "" : note.getContent();
            return room;
        }
    }
}
