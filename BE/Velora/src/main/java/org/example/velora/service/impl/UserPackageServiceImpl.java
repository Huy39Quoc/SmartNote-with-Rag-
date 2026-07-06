package org.example.velora.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.entity.PackageService;
import org.example.velora.entity.User;
import org.example.velora.exception.BadRequestException;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.repository.PackageServiceRepository;
import org.example.velora.repository.RefreshTokenRepository;
import org.example.velora.repository.UserRepository;
import org.example.velora.service.UserPackageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class UserPackageServiceImpl implements UserPackageService {

    private static final String DEFAULT_FREE_PACKAGE_NAME = "FREE";

    private final PackageServiceRepository packageServiceRepository;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;

    @Override
    @Transactional(readOnly = true)
    public List<PackageService> getActivePackages() {
        return packageServiceRepository.findByIsActiveTrue();
    }

    @Override
    @Transactional(readOnly = true)
    public PackageService getDefaultFreePackage() {
        return packageServiceRepository.findByName(DEFAULT_FREE_PACKAGE_NAME)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy cấu hình gói mặc định FREE trong hệ thống."));
    }

    @Override
    @Transactional(readOnly = true)
    public PackageService getActivePackage(User user) {
        if (user == null) {
            return buildFallbackFreePackage();
        }

        boolean hasNoPackage = user.getCurrentPackage() == null;
        boolean hasExpiredPackage = user.getPackageExpiryDate() == null
                || user.getPackageExpiryDate().isBefore(LocalDateTime.now());

        if (hasNoPackage || hasExpiredPackage) {
            return packageServiceRepository.findByName(DEFAULT_FREE_PACKAGE_NAME)
                    .orElseGet(this::buildFallbackFreePackage);
        }

        return user.getCurrentPackage();
    }

    @Override
    public void checkFeatureAccess(User user, String featureCode) {
        PackageService pkg = getActivePackage(user);

        if (!hasFeature(pkg, featureCode)) {
            throw new BadRequestException(
                    ApiResponse.fail("Gói dịch vụ của bạn không hỗ trợ tính năng này. Vui lòng nâng cấp!")
                            .getMessage()
            );
        }
    }

    @Override
    public void checkAiUsage(User user, String requiredFeature) {
        PackageService pkg = getActivePackage(user);

        if (!hasFeature(pkg, requiredFeature)) {
            throw new BadRequestException(
                    ApiResponse.fail("Gói dịch vụ của bạn không hỗ trợ tính năng này. Vui lòng nâng cấp!")
                            .getMessage()
            );
        }

        resetAiCounterIfNewMonth(user);

        Integer maxAi = pkg.getMaxAiFormatsPerMonth();
        if (!isUnlimited(maxAi) && safeAiUsed(user) >= maxAi) {
            throw new BadRequestException(
                    ApiResponse.fail("Bạn đã dùng hết lượt AI (" + maxAi + " lượt) của tháng này.")
                            .getMessage()
            );
        }
    }

    @Override
    public void checkStorageLimit(User user, long newFileSizeBytes) {
        PackageService pkg = getActivePackage(user);

        if (isUnlimited(pkg.getStorageGb())) {
            return;
        }

        long maxStorageBytes = pkg.getStorageGb() * 1024L * 1024L * 1024L;
        long currentUsed = user.getDocuments() == null
                ? 0
                : user.getDocuments().stream()
                .mapToLong(d -> d.getFileSize() == null ? 0 : d.getFileSize())
                .sum();

        if (currentUsed + newFileSizeBytes > maxStorageBytes) {
            throw new BadRequestException(
                    ApiResponse.fail("Không đủ dung lượng lưu trữ. Gói của bạn tối đa "
                                    + pkg.getStorageGb() + "GB.")
                            .getMessage()
            );
        }
    }

    @Override
    public void checkMaxNotes(User user) {
        PackageService pkg = getActivePackage(user);

        if (isUnlimited(pkg.getMaxNotes())) {
            return;
        }

        int currentNoteCount = user.getNotes() == null ? 0 : user.getNotes().size();
        if (currentNoteCount >= pkg.getMaxNotes()) {
            throw new BadRequestException(
                    ApiResponse.fail("Bạn đã đạt giới hạn tối đa "
                                    + pkg.getMaxNotes()
                                    + " ghi chú. Vui lòng nâng cấp gói để tạo thêm!")
                            .getMessage()
            );
        }
    }

    @Override
    public void checkMaxDevices(User user) {
        PackageService pkg = getActivePackage(user);

        if (isUnlimited(pkg.getMaxDevices())) {
            return;
        }

        long activeDevices = refreshTokenRepository.countByUser(user);
        if (activeDevices >= pkg.getMaxDevices()) {
            throw new BadRequestException(
                    ApiResponse.fail("Tài khoản của bạn đã đạt giới hạn đăng nhập trên "
                                    + pkg.getMaxDevices()
                                    + " thiết bị cùng lúc.")
                            .getMessage()
            );
        }
    }

    @Override
    public void increaseAiUsage(User user) {
        user.setAiUsedThisMonth(safeAiUsed(user) + 1);
        user.setLastAiUsageDate(LocalDateTime.now());
        userRepository.save(user);
    }

    private void resetAiCounterIfNewMonth(User user) {
        LocalDateTime now = LocalDateTime.now();

        boolean neverUsedAi = user.getLastAiUsageDate() == null;
        boolean newMonth = !neverUsedAi
                && (user.getLastAiUsageDate().getMonth() != now.getMonth()
                || user.getLastAiUsageDate().getYear() != now.getYear());

        if (neverUsedAi || newMonth) {
            user.setAiUsedThisMonth(0);
            user.setLastAiUsageDate(now);
            userRepository.save(user);
        }
    }

    private boolean hasFeature(PackageService pkg, String featureCode) {
        if (pkg == null || pkg.getFeatures() == null || featureCode == null) {
            return false;
        }

        return Arrays.stream(pkg.getFeatures().split(","))
                .map(String::trim)
                .anyMatch(feature -> feature.equalsIgnoreCase(featureCode.trim()));
    }

    private boolean isUnlimited(Integer value) {
        return value == null || value < 0;
    }

    private int safeAiUsed(User user) {
        return user.getAiUsedThisMonth() == null ? 0 : user.getAiUsedThisMonth();
    }

    private PackageService buildFallbackFreePackage() {
        PackageService free = new PackageService();
        free.setName(DEFAULT_FREE_PACKAGE_NAME);
        free.setStorageGb(1);
        free.setMaxNotes(50);
        free.setMaxDevices(1);
        free.setMaxAiFormatsPerMonth(10);
        free.setFeatures("TAG_SUBJECT,CHECKLIST_BASIC,AI_NOTE_FORMAT,AI_SUMMARY_BASIC,AI_CHAT,DOCUMENT_UPLOAD");
        return free;
    }
}
