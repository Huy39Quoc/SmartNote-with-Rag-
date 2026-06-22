package org.example.velora.service.impl;

import org.example.velora.dto.request.ChatRequest;
import org.example.velora.dto.response.ChatResponse;
import org.example.velora.entity.ChatMessage;
import org.example.velora.entity.ChatSession;
import org.example.velora.entity.User;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.repository.ChatMessageRepository;
import org.example.velora.repository.ChatSessionRepository;
import org.example.velora.repository.UserRepository;
import org.example.velora.service.AiService;
import org.example.velora.service.ChatService;
import org.example.velora.util.ChromaDbClient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor @Transactional
public class ChatServiceImpl implements ChatService {

    private final ChatSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;
    private final UserRepository userRepository;
    private final AiService aiService;
    private final ChromaDbClient chromaDbClient;

    @Override
    public ChatResponse.SessionDetail createSession(UUID userId, ChatRequest.CreateSession req) {
        User user = getUser(userId);
        ChatSession session = ChatSession.builder()
            .user(user).title(req.getTitle())
            .contextType(req.getContextType())
            .contextId(req.getContextId()).build();
        return toDetail(sessionRepository.save(session));
    }

    @Override
    public ChatResponse.AskResult ask(UUID userId, UUID sessionId, ChatRequest.Ask req) {
        ChatSession session = findSession(userId, sessionId);

        // Save user message
        ChatMessage userMsg = ChatMessage.builder()
            .session(session).role(ChatMessage.Role.USER).content(req.getMessage()).build();
        messageRepository.save(userMsg);

        // RAG: search relevant chunks
        List<String> chunks = chromaDbClient.search(req.getMessage(), userId.toString(),
            session.getContextId() != null ? session.getContextId().toString() : null);

        // Call LM Studio
        String answer = aiService.chatWithContext(req.getMessage(), chunks);

        // Save assistant message
        ChatMessage assistantMsg = ChatMessage.builder()
            .session(session).role(ChatMessage.Role.ASSISTANT)
            .content(answer)
            .sourceChunks(String.join("|||", chunks)).build();
        messageRepository.save(assistantMsg);

        // Auto-title first exchange
        if (messageRepository.countBySessionId(sessionId) == 2 && session.getTitle() == null) {
            session.setTitle(req.getMessage().length() > 50
                ? req.getMessage().substring(0, 47) + "..." : req.getMessage());
            sessionRepository.save(session);
        }

        return ChatResponse.AskResult.builder()
            .userMessage(toMessageItem(userMsg))
            .assistantMessage(toMessageItem(assistantMsg)).build();
    }

    @Override @Transactional(readOnly = true)
    public List<ChatResponse.SessionSummary> getSessions(UUID userId) {
        return sessionRepository.findByUserIdOrderByUpdatedAtDesc(userId)
            .stream().map(this::toSummary).toList();
    }

    @Override @Transactional(readOnly = true)
    public ChatResponse.SessionDetail getSession(UUID userId, UUID sessionId) {
        return toDetail(findSession(userId, sessionId));
    }

    @Override
    public ChatResponse.SessionDetail updateSession(UUID userId, UUID sessionId, ChatRequest.UpdateSession req) {
        ChatSession session = findSession(userId, sessionId);
        if (req.getTitle() != null) session.setTitle(req.getTitle());
        return toDetail(sessionRepository.save(session));
    }

    @Override
    public void deleteSession(UUID userId, UUID sessionId) {
        sessionRepository.delete(findSession(userId, sessionId));
    }

    private ChatSession findSession(UUID userId, UUID sessionId) {
        ChatSession s = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new ResourceNotFoundException("Session không tồn tại"));
        if (!s.getUser().getId().equals(userId))
            throw new ResourceNotFoundException("Session không tồn tại");
        return s;
    }

    private User getUser(UUID userId) {
        return userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
    }

    private ChatResponse.SessionSummary toSummary(ChatSession s) {
        String last = s.getMessages().isEmpty() ? null
            : s.getMessages().get(s.getMessages().size() - 1).getContent();
        return ChatResponse.SessionSummary.builder()
            .id(s.getId()).title(s.getTitle()).contextType(s.getContextType())
            .lastMessage(last).updatedAt(s.getUpdatedAt()).build();
    }

    private ChatResponse.SessionDetail toDetail(ChatSession s) {
        List<ChatResponse.MessageItem> msgs = messageRepository
            .findBySessionIdOrderByCreatedAtAsc(s.getId())
            .stream().map(this::toMessageItem).toList();
        return ChatResponse.SessionDetail.builder()
            .id(s.getId()).title(s.getTitle()).contextType(s.getContextType())
            .contextId(s.getContextId()).messages(msgs)
            .createdAt(s.getCreatedAt()).updatedAt(s.getUpdatedAt()).build();
    }

    private ChatResponse.MessageItem toMessageItem(ChatMessage m) {
        List<String> chunks = m.getSourceChunks() != null
            ? List.of(m.getSourceChunks().split("\\|\\|\\|")) : List.of();
        return ChatResponse.MessageItem.builder()
            .id(m.getId()).role(m.getRole()).content(m.getContent())
            .sourceChunks(chunks).createdAt(m.getCreatedAt()).build();
    }
}
