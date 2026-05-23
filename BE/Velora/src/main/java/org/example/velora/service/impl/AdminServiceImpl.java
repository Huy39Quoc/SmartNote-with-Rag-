package org.example.velora.service.impl;

import org.example.velora.dto.request.UserRequest;
import org.example.velora.dto.response.UserResponse;
import org.example.velora.entity.*;
import org.example.velora.exception.BadRequestException;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.repository.*;
import org.example.velora.service.AdminService;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service @RequiredArgsConstructor @Transactional
public class AdminServiceImpl implements AdminService {

    private final UserRepository userRepository;
    private final NoteRepository noteRepository;
    private final DocumentRepository documentRepository;
    private final SystemPromptRepository systemPromptRepository;
    private final NotificationRepository notificationRepository;
    private final ActivityLogRepository activityLogRepository;

    @Override @Transactional(readOnly = true)
    public UserResponse.Page getUsers(String keyword, Pageable pageable) {
        Page<User> page = StringUtils.hasText(keyword)
            ? userRepository.findByEmailContainingIgnoreCaseOrFullNameContainingIgnoreCase(keyword, keyword, pageable)
            : userRepository.findAll(pageable);
        return UserResponse.Page.builder()
            .content(page.getContent().stream().map(this::toAdminView).toList())
            .pageNumber(page.getNumber()).pageSize(page.getSize())
            .totalElements(page.getTotalElements())
            .totalPages(page.getTotalPages()).last(page.isLast()).build();
    }

    @Override
    public UserResponse.AdminView updateUser(UUID userId, UserRequest.AdminUpdate req) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
        if (req.getFullName() != null) user.setFullName(req.getFullName());
        if (req.getRole() != null) user.setRole(req.getRole());
        if (req.getIsActive() != null) user.setIsActive(req.getIsActive());
        return toAdminView(userRepository.save(user));
    }

    @Override
    public void deleteUser(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
        if (user.getRole() == User.Role.ADMIN)
            throw new BadRequestException("Không thể xoá tài khoản Admin");
        userRepository.delete(user);
    }

    @Override @Transactional(readOnly = true)
    public Object getSystemStats() {
        long totalUsers     = userRepository.count();
        long activeUsers    = userRepository.countActiveUsers();
        long totalNotes     = noteRepository.count();
        long totalDocuments = documentRepository.count();
        long doneDocuments  = documentRepository.countByStatus(Document.Status.DONE);
        return Map.of(
            "totalUsers",     totalUsers,
            "activeUsers",    activeUsers,
            "totalNotes",     totalNotes,
            "totalDocuments", totalDocuments,
            "doneDocuments",  doneDocuments
        );
    }

    @Override @Transactional(readOnly = true)
    public List<SystemPrompt> getSystemPrompts() {
        return systemPromptRepository.findAllByOrderByPromptKeyAsc();
    }

    @Override
    public SystemPrompt updateSystemPrompt(UUID promptId, String promptText) {
        SystemPrompt sp = systemPromptRepository.findById(promptId)
            .orElseThrow(() -> new ResourceNotFoundException("Prompt không tồn tại"));
        sp.setPromptText(promptText);
        return systemPromptRepository.save(sp);
    }

    @Override
    public void broadcast(String title, String message) {
        List<User> users = userRepository.findAll();
        List<Notification> notifs = users.stream().map(u ->
            Notification.builder().user(u).title(title)
                .message(message).isBroadcast(true).build()
        ).toList();
        notificationRepository.saveAll(notifs);
    }

    @Override @Transactional(readOnly = true)
    public Object getAiUsageStats() {
        return Map.of("message", "AI usage stats — implement with ActivityLog");
    }

    private UserResponse.AdminView toAdminView(User u) {
        return UserResponse.AdminView.builder()
            .id(u.getId()).email(u.getEmail()).fullName(u.getFullName())
            .role(u.getRole()).isActive(u.getIsActive())
            .noteCount((int) noteRepository.countByUserId(u.getId()))
            .documentCount((int) documentRepository.countByUserId(u.getId()))
            .createdAt(u.getCreatedAt()).updatedAt(u.getUpdatedAt()).build();
    }
}
