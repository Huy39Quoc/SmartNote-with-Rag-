package org.example.velora.service;

import org.example.velora.dto.request.UserRequest;
import org.example.velora.dto.response.UserResponse;

import java.util.UUID;

public interface UserService {

    UserResponse.Profile getProfile(UUID userId);

    UserResponse.Profile updateProfile(UUID userId, UserRequest.UpdateProfile req);
}