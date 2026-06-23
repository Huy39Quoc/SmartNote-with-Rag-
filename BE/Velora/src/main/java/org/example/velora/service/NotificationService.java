package org.example.velora.service;

import org.example.velora.dto.response.NotificationResponse;

import java.util.List;
import java.util.UUID;

public interface NotificationService {

    List<NotificationResponse.Item> getAll(UUID userId, boolean unreadOnly);

    NotificationResponse.UnreadCount getUnreadCount(UUID userId);

    NotificationResponse.Item markAsRead(UUID userId, UUID notificationId);

    void markAllAsRead(UUID userId);
}