package org.example.velora.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.velora.entity.Document;
import org.example.velora.entity.PackageService;
import org.example.velora.entity.User;
import org.example.velora.exception.BadRequestException;
import org.example.velora.repository.RefreshTokenRepository;
import org.example.velora.repository.UserRepository;
import org.example.velora.service.PackageValidationService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Arrays;

@Service
@RequiredArgsConstructor
public class PackageValidationServiceImpl implements PackageValidationService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;

    @Override
    public void validateAiUsage(User user, String requiredFeature) {
        PackageService pkg = getActivePackage(user);

        if (!hasFeature(pkg, requiredFeature)) {
            throw new BadRequestException("Gói dịch vụ của bạn không hỗ trợ tính năng này. Vui lòng nâng cấp!");
        }

        resetAiCounterIfNewMonth(user);

        Integer maxAi = pkg.getMaxAiFormatsPerMonth();

        if (!isUnlimited(maxAi) && safeAiUsed(user) >= maxAi) {
            throw new BadRequestException("Bạn đã dùng hết lượt AI (" + maxAi + " lượt) của tháng này.");
        }
    }

    @Override
    public void validateStorageLimit(User user, long newFileSizeBytes) {
        PackageService pkg = getActivePackage(user);

        if (isUnlimited(pkg.getStorageGb())) return;

        long maxStorageBytes = pkg.getStorageGb() * 1024L * 1024L * 1024L;

        long currentStorageUsed = user.getDocuments() == null
                ? 0
                : user.getDocuments().stream()
                .mapToLong(Document::getFileSize)
                .sum();

        if (currentStorageUsed + newFileSizeBytes > maxStorageBytes) {
            throw new BadRequestException("Không đủ dung lượng lưu trữ. Gói của bạn tối đa " + pkg.getStorageGb() + "GB.");
        }
    }

    @Override
    public PackageService getActivePackage(User user) {
        if (user.getCurrentPackage() == null ||
                user.getPackageExpiryDate() == null ||
                user.getPackageExpiryDate().isBefore(LocalDateTime.now())) {

            PackageService freePackage = new PackageService();
            freePackage.setName("FREE");
            freePackage.setStorageGb(1);
            freePackage.setMaxNotes(50);
            freePackage.setMaxDevices(1);
            freePackage.setMaxAiFormatsPerMonth(10);
            freePackage.setFeatures("TAG_SUBJECT,CHECKLIST_BASIC,AI_NOTE_FORMAT,AI_SUMMARY_BASIC,AI_CHAT,DOCUMENT_UPLOAD");

            return freePackage;
        }

        return user.getCurrentPackage();
    }

    @Override
    public void resetAiCounterIfNewMonth(User user) {
        LocalDateTime now = LocalDateTime.now();

        if (user.getLastAiUsageDate() == null ||
                user.getLastAiUsageDate().getMonth() != now.getMonth() ||
                user.getLastAiUsageDate().getYear() != now.getYear()) {

            user.setAiUsedThisMonth(0);
            user.setLastAiUsageDate(now);
            userRepository.save(user);
        }
    }

    @Override
    public void incrementAiUsage(User user) {
        user.setAiUsedThisMonth(safeAiUsed(user) + 1);
        user.setLastAiUsageDate(LocalDateTime.now());
        userRepository.save(user);
    }

    @Override
    public void validateMaxNotes(User user) {
        PackageService pkg = getActivePackage(user);

        if (isUnlimited(pkg.getMaxNotes())) return;

        int noteCount = user.getNotes() == null ? 0 : user.getNotes().size();

        if (noteCount >= pkg.getMaxNotes()) {
            throw new BadRequestException("Bạn đã đạt giới hạn tối đa " + pkg.getMaxNotes() + " ghi chú. Vui lòng nâng cấp gói để tạo thêm!");
        }
    }

    @Override
    public void validateFeatureAccess(User user, String featureCode) {
        PackageService pkg = getActivePackage(user);

        if (!hasFeature(pkg, featureCode)) {
            throw new BadRequestException("Gói dịch vụ của bạn không hỗ trợ tính năng này. Vui lòng nâng cấp!");
        }
    }

    @Override
    public void validateMaxDevices(User user) {
        PackageService pkg = getActivePackage(user);

        if (isUnlimited(pkg.getMaxDevices())) return;

        long activeDevices = refreshTokenRepository.countByUser(user);

        if (activeDevices >= pkg.getMaxDevices()) {
            throw new BadRequestException("Tài khoản của bạn đã đạt giới hạn đăng nhập trên " + pkg.getMaxDevices() + " thiết bị cùng lúc.");
        }
    }

    private boolean hasFeature(PackageService pkg, String featureCode) {
        if (pkg == null || pkg.getFeatures() == null || featureCode == null) {
            return false;
        }

        return Arrays.stream(pkg.getFeatures().split(","))
                .map(String::trim)
                .anyMatch(f -> f.equalsIgnoreCase(featureCode.trim()));
    }

    private boolean isUnlimited(Integer value) {
        return value == null || value < 0;
    }

    private int safeAiUsed(User user) {
        return user.getAiUsedThisMonth() == null ? 0 : user.getAiUsedThisMonth();
    }
}