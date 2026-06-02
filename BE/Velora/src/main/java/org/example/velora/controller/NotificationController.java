package org.example.velora.controller;

import lombok.RequiredArgsConstructor;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.dto.response.NotificationResponse;
import org.example.velora.entity.Notification;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.repository.NotificationRepository;
import org.example.velora.security.UserDetailsImpl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notificationRepository;

    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationResponse.Item>>> getAll(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @RequestParam(defaultValue = "false") boolean unreadOnly
    ) {
        List<Notification> notifications = unreadOnly
                ? notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(u.getUserId())
                : notificationRepository.findByUserIdOrderByCreatedAtDesc(u.getUserId());

        List<NotificationResponse.Item> result = notifications.stream()
                .map(this::toItem)
                .toList();

        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<NotificationResponse.UnreadCount>> unreadCount(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u
    ) {
        long count = notificationRepository.countByUserIdAndIsReadFalse(u.getUserId());

        return ResponseEntity.ok(ApiResponse.ok(
                NotificationResponse.UnreadCount.builder()
                        .count(count)
                        .build()
        ));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationResponse.Item>> markAsRead(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @PathVariable UUID id
    ) {
        Notification notification = getOwnedNotification(u.getUserId(), id);
        notification.setIsRead(true);

        return ResponseEntity.ok(ApiResponse.ok(
                "Đã đánh dấu đã đọc",
                toItem(notificationRepository.save(notification))
        ));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u
    ) {
        List<Notification> notifications =
                notificationRepository.findByUserIdAndIsReadFalseOrderByCreatedAtDesc(u.getUserId());

        notifications.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(notifications);

        return ResponseEntity.ok(ApiResponse.ok("Đã đánh dấu tất cả là đã đọc", null));
    }

    private Notification getOwnedNotification(UUID userId, UUID notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Thông báo không tồn tại"));

        if (notification.getUser() == null || !notification.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Thông báo không tồn tại");
        }

        return notification;
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