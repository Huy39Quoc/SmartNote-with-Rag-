package org.example.velora.controller;

import lombok.RequiredArgsConstructor;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.dto.response.NotificationResponse;
import org.example.velora.security.UserDetailsImpl;
import org.example.velora.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationResponse.Item>>> getAll(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @RequestParam(defaultValue = "false") boolean unreadOnly) {
        return ResponseEntity.ok(ApiResponse.ok(
                notificationService.getAll(u.getUserId(), unreadOnly)));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<NotificationResponse.UnreadCount>> unreadCount(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u) {
        return ResponseEntity.ok(ApiResponse.ok(
                notificationService.getUnreadCount(u.getUserId())));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationResponse.Item>> markAsRead(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok("Đã đánh dấu đã đọc",
                notificationService.markAsRead(u.getUserId(), id)));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u) {
        notificationService.markAllAsRead(u.getUserId());
        return ResponseEntity.ok(ApiResponse.ok("Đã đánh dấu tất cả là đã đọc", null));
    }
}
