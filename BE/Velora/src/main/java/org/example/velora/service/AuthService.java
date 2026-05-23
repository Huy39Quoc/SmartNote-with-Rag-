package org.example.velora.service;

import org.example.velora.dto.request.AuthRequest;
import org.example.velora.dto.response.AuthResponse;

public interface AuthService {
    AuthResponse.TokenPair register(AuthRequest.Register request);
    AuthResponse.TokenPair login(AuthRequest.Login request);
    AuthResponse.TokenPair refreshToken(String refreshToken);
    void logout(String refreshToken);
    void changePassword(String email, AuthRequest.ChangePassword request);
}
