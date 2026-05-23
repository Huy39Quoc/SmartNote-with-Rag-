package org.example.velora.dto.response;

import org.example.velora.entity.User;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

public class AuthResponse {

    @Data
    @Builder
    public static class TokenPair {
        private String accessToken;
        private String refreshToken;
        private String tokenType;
        private long expiresIn;
        private UserInfo user;
    }

    @Data
    @Builder
    public static class UserInfo {
        private UUID id;
        private String email;
        private String fullName;
        private User.Role role;
        private LocalDateTime createdAt;
    }

    @Data
    @Builder
    public static class MessageOnly {
        private String message;
    }
}
