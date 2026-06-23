package org.example.velora.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.velora.dto.response.NotificationResponse;
import org.example.velora.entity.Notification;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.repository.NotificationRepository;
import org.example.velora.service.NotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;

    @Override
    @Transactional(readOnly = true)
    public List<NotificationResponse.Item> getAll(UUID userId, boolean unreadOnly) {
        List<Notification> list = unreadOnly
                ? notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId)
                : notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return list.stream().map(this::toItem).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationResponse.UnreadCount getUnreadCount(UUID userId) {
        return NotificationResponse.UnreadCount.builder()
                .count(notificationRepository.countByUserIdAndIsReadFalse(userId))
                .build();
    }

    @Override
    public NotificationResponse.Item markAsRead(UUID userId, UUID notificationId) {
        Notification notification = ownerOnly(userId, notificationId);
        notification.setIsRead(true);
        return toItem(notificationRepository.save(notification));
    }

    @Override
    public void markAllAsRead(UUID userId) {
        List<Notification> unread =
                notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(userId);
        unread.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(unread);
    }

    private Notification ownerOnly(UUID userId, UUID notificationId) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Thông báo không tồn tại"));
        if (n.getUser() == null || !n.getUser().getId().equals(userId))
            throw new ResourceNotFoundException("Thông báo không tồn tại");
        return n;
    }

    private NotificationResponse.Item toItem(Notification n) {
        return NotificationResponse.Item.builder()
                .id(n.getId())
                .title(n.getTitle())
                .message(n.getMessage())
                .isBroadcast(n.getIsBroadcast())
                .isRead(n.getIsRead())
                .createdAt(n.getCreatedAt())
                .build();
    }
}