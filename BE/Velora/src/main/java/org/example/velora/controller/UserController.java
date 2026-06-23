package org.example.velora.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.velora.dto.request.UserRequest;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.dto.response.UserResponse;
import org.example.velora.security.UserDetailsImpl;
import org.example.velora.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse.Profile>> me(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u) {
        return ResponseEntity.ok(ApiResponse.ok(userService.getProfile(u.getUserId())));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse.Profile>> update(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @Valid @RequestBody UserRequest.UpdateProfile req) {
        return ResponseEntity.ok(ApiResponse.ok(userService.updateProfile(u.getUserId(), req)));
    }
}