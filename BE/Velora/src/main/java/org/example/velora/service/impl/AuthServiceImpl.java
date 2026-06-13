package org.example.velora.service.impl;

import org.example.velora.dto.request.AuthRequest;
import org.example.velora.dto.response.AuthResponse;
import org.example.velora.entity.RefreshToken;
import org.example.velora.entity.User;
import org.example.velora.exception.BadRequestException;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.exception.UnauthorizedException;
import org.example.velora.repository.RefreshTokenRepository;
import org.example.velora.repository.UserRepository;
import org.example.velora.security.JwtTokenProvider;
import org.example.velora.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.example.velora.service.PackageValidationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AuthenticationManager authenticationManager;
    private final PackageValidationService packageValidationService;

    @Value("${jwt.refresh-token-expiry}") private long refreshExpiry;
    @Value("${jwt.access-token-expiry}") private long accessExpiry;

    @Override
    public AuthResponse.TokenPair register(AuthRequest.Register req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new BadRequestException("Email đã được sử dụng");
        }
        User user = User.builder()
            .email(req.getEmail())
            .passwordHash(passwordEncoder.encode(req.getPassword()))
            .fullName(req.getFullName())
            .build();
        userRepository.save(user);
        return buildTokenPair(user);
    }

    @Override
    public AuthResponse.TokenPair login(AuthRequest.Login req) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword())
        );
        User user = userRepository.findByEmail(req.getEmail())
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        packageValidationService.validateMaxDevices(user);
        return buildTokenPair(user);
    }

    @Override
    public AuthResponse.TokenPair refreshToken(String refreshToken) {
        RefreshToken rt = refreshTokenRepository.findByToken(refreshToken)
            .orElseThrow(() -> new UnauthorizedException("Refresh token không hợp lệ"));
        if (rt.getExpiredAt().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(rt);
            throw new UnauthorizedException("Refresh token đã hết hạn");
        }
        refreshTokenRepository.delete(rt);
        return buildTokenPair(rt.getUser());
    }

    @Override
    public void logout(String refreshToken) {
        refreshTokenRepository.findByToken(refreshToken)
            .ifPresent(refreshTokenRepository::delete);
    }

    @Override
    public void changePassword(String email, AuthRequest.ChangePassword req) {
        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!passwordEncoder.matches(req.getOldPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Mật khẩu cũ không đúng");
        }
        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        userRepository.save(user);
        refreshTokenRepository.deleteByUserId(user.getId());
    }

    private AuthResponse.TokenPair buildTokenPair(User user) {
        String accessToken = jwtTokenProvider.generateAccessToken(user.getEmail(), user.getRole().name());
        String rawRefresh = jwtTokenProvider.generateRefreshToken();
        RefreshToken rt = RefreshToken.builder()
            .user(user).token(rawRefresh)
            .expiredAt(LocalDateTime.now().plusSeconds(refreshExpiry / 1000))
            .build();
        refreshTokenRepository.save(rt);
        return AuthResponse.TokenPair.builder()
            .accessToken(accessToken).refreshToken(rawRefresh)
            .tokenType("Bearer").expiresIn(accessExpiry / 1000)
            .user(AuthResponse.UserInfo.builder()
                .id(user.getId()).email(user.getEmail())
                .fullName(user.getFullName()).role(user.getRole())
                .createdAt(user.getCreatedAt()).build())
            .build();
    }
}
