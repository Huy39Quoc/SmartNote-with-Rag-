package org.example.velora.controller;

import org.example.velora.dto.request.AuthRequest;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.dto.response.AuthResponse;
import org.example.velora.security.UserDetailsImpl;
import org.example.velora.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/auth") @RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse.TokenPair>> register(
            @Valid @RequestBody AuthRequest.Register req) {
        return ResponseEntity.ok(ApiResponse.ok("Đăng ký thành công", authService.register(req)));
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse.TokenPair>> login(
            @Valid @RequestBody AuthRequest.Login req) {
        return ResponseEntity.ok(ApiResponse.ok("Đăng nhập thành công", authService.login(req)));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse.TokenPair>> refresh(
            @Valid @RequestBody AuthRequest.RefreshToken req) {
        return ResponseEntity.ok(ApiResponse.ok(authService.refreshToken(req.getRefreshToken())));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @Valid @RequestBody AuthRequest.RefreshToken req) {
        authService.logout(req.getRefreshToken());
        return ResponseEntity.ok(ApiResponse.ok("Đăng xuất thành công", null));
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @Valid @RequestBody AuthRequest.ChangePassword req) {
        authService.changePassword(u.getUsername(), req);
        return ResponseEntity.ok(ApiResponse.ok("Đổi mật khẩu thành công", null));
    }
}
