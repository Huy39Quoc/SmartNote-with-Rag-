package org.example.velora.mapper;

import org.example.velora.dto.response.UserResponse;
import org.example.velora.entity.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {
    public UserResponse.Profile toProfile(User u) {
        return UserResponse.Profile.builder()
            .id(u.getId()).email(u.getEmail()).fullName(u.getFullName())
            .role(u.getRole()).createdAt(u.getCreatedAt()).build();
    }
}
