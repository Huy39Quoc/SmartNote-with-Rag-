package org.example.velora.controller;

import org.example.velora.dto.request.UserRequest;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.dto.response.UserResponse;
import org.example.velora.entity.User;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.mapper.UserMapper;
import org.example.velora.repository.UserRepository;
import org.example.velora.security.UserDetailsImpl;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/users") @RequiredArgsConstructor
public class UserController {
    private final UserRepository userRepository;
    private final UserMapper userMapper;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse.Profile>> me(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u) {
        User user = userRepository.findById(u.getUserId())
            .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
        return ResponseEntity.ok(ApiResponse.ok(userMapper.toProfile(user)));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse.Profile>> update(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @Valid @RequestBody UserRequest.UpdateProfile req) {
        User user = userRepository.findById(u.getUserId())
            .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
        if (req.getFullName() != null) user.setFullName(req.getFullName());
        return ResponseEntity.ok(ApiResponse.ok(userMapper.toProfile(userRepository.save(user))));
    }
}
