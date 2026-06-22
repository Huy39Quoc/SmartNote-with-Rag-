package org.example.velora.service.impl;

import org.example.velora.dto.request.AuthRequest;
import org.example.velora.dto.response.AuthResponse;
import org.example.velora.entity.PackageService;
import org.example.velora.entity.RefreshToken;
import org.example.velora.entity.User;
import org.example.velora.exception.BadRequestException;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.exception.UnauthorizedException;
import org.example.velora.mapper.UserMapper;
import org.example.velora.repository.PackageServiceRepository;
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
    private final PackageServiceRepository packageServiceRepository;
    private final UserMapper userMapper;

    @Value("${jwt.refresh-token-expiry}")
    private long refreshExpiry;

    @Value("${jwt.access-token-expiry}")
    private long accessExpiry;

    @Override
    public AuthResponse.TokenPair register(AuthRequest.Register request) {
        String email = request.getEmail() == null
                ? null
                : request.getEmail().trim().toLowerCase();

        String fullName = request.getFullName() == null
                ? null
                : request.getFullName().trim();

        String password = request.getPassword();

        if (email == null || email.isBlank()) {
            throw new BadRequestException("Email không được để trống");
        }

        if (fullName == null || fullName.isBlank()) {
            throw new BadRequestException("Họ và tên không được để trống");
        }

        if (password == null || password.isBlank()) {
            throw new BadRequestException("Mật khẩu không được để trống");
        }

        if (!password.equals(password.trim())) {
            throw new BadRequestException("Mật khẩu không được bắt đầu hoặc kết thúc bằng khoảng trắng");
        }

        if (password.length() < 6 || password.length() > 100) {
            throw new BadRequestException("Mật khẩu phải từ 6–100 ký tự");
        }

        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email đã được sử dụng!");
        }

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setFullName(fullName);
        user.setRole(User.Role.USER);
        user.setAiUsedThisMonth(0);

        PackageService freePackage = packageServiceRepository.findByName("FREE")
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy cấu hình gói mặc định FREE trong hệ thống."
                ));

        user.setCurrentPackage(freePackage);
        user.setPackageExpiryDate(LocalDateTime.now().plusYears(99));

        User savedUser = userRepository.save(user);

        /*
         * Sau khi register KHÔNG tạo accessToken / refreshToken.
         * Lý do:
         * - FE đang yêu cầu user tự đăng nhập lại.
         * - Nếu vẫn lưu refresh token ở đây thì FREE sẽ bị tính là đã đăng nhập 1 thiết bị.
         */
        return AuthResponse.TokenPair.builder()
                .accessToken(null)
                .refreshToken(null)
                .tokenType("Bearer")
                .expiresIn(0L)
                .user(AuthResponse.UserInfo.builder()
                        .id(savedUser.getId())
                        .email(savedUser.getEmail())
                        .fullName(savedUser.getFullName())
                        .role(savedUser.getRole())
                        .createdAt(savedUser.getCreatedAt())
                        .build())
                .build();
    }

    @Override
    public AuthResponse.TokenPair login(AuthRequest.Login req) {
        String email = req.getEmail() == null
                ? null
                : req.getEmail().trim().toLowerCase();

        String password = req.getPassword();

        if (email == null || email.isBlank()) {
            throw new BadRequestException("Email không được để trống");
        }

        if (password == null || password.isBlank()) {
            throw new BadRequestException("Mật khẩu không được để trống");
        }

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, password)
        );

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        refreshTokenRepository.deleteExpired();

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

        String oldPassword = req.getOldPassword();
        String newPassword = req.getNewPassword();

        if (newPassword == null || newPassword.isBlank()) {
            throw new BadRequestException("Mật khẩu mới không được để trống");
        }

        if (!newPassword.equals(newPassword.trim())) {
            throw new BadRequestException("Mật khẩu mới không được bắt đầu hoặc kết thúc bằng khoảng trắng");
        }

        if (newPassword.length() < 6 || newPassword.length() > 100) {
            throw new BadRequestException("Mật khẩu mới phải từ 6–100 ký tự");
        }

        if (!passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new BadRequestException("Mật khẩu cũ không đúng");
        }

        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new BadRequestException("Mật khẩu mới không được trùng với mật khẩu cũ");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        refreshTokenRepository.deleteByUserId(user.getId());
    }

    private AuthResponse.TokenPair buildTokenPair(User user) {
        String accessToken = jwtTokenProvider.generateAccessToken(
                user.getEmail(),
                user.getRole().name()
        );

        String rawRefresh = jwtTokenProvider.generateRefreshToken();

        RefreshToken rt = RefreshToken.builder()
                .user(user)
                .token(rawRefresh)
                .expiredAt(LocalDateTime.now().plusSeconds(refreshExpiry / 1000))
                .build();

        refreshTokenRepository.save(rt);

        return AuthResponse.TokenPair.builder()
                .accessToken(accessToken)
                .refreshToken(rawRefresh)
                .tokenType("Bearer")
                .expiresIn(accessExpiry / 1000)
                .user(AuthResponse.UserInfo.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .fullName(user.getFullName())
                        .role(user.getRole())
                        .createdAt(user.getCreatedAt())
                        .build())
                .build();
    }
}