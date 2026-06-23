package org.example.velora.dto;

import org.example.velora.dto.response.ApiResponse;
import org.example.velora.entity.PackageService;
import org.example.velora.entity.User;
import org.example.velora.exception.BadRequestException;
import org.example.velora.repository.RefreshTokenRepository;
import org.example.velora.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.Arrays;

public final class PackageValidationDto {

    private PackageValidationDto() {}


    public static PackageService getActivePackage(User user) {
        if (user.getCurrentPackage() == null
                || user.getPackageExpiryDate() == null
                || user.getPackageExpiryDate().isBefore(LocalDateTime.now())) {

            PackageService free = new PackageService();
            free.setName("FREE");
            free.setStorageGb(1);
            free.setMaxNotes(50);
            free.setMaxDevices(1);
            free.setMaxAiFormatsPerMonth(10);
            free.setFeatures("TAG_SUBJECT,CHECKLIST_BASIC,AI_NOTE_FORMAT,AI_SUMMARY_BASIC,AI_CHAT,DOCUMENT_UPLOAD");
            return free;
        }

        return user.getCurrentPackage();
    }


    public static void validateAiUsage(User user, String requiredFeature, UserRepository userRepository) {
        PackageService pkg = getActivePackage(user);

        if (!hasFeature(pkg, requiredFeature)) {
            throw new BadRequestException(
                    ApiResponse.fail("Gói dịch vụ của bạn không hỗ trợ tính năng này. Vui lòng nâng cấp!").getMessage()
            );
        }

        resetAiCounterIfNewMonth(user, userRepository);

        Integer maxAi = pkg.getMaxAiFormatsPerMonth();
        if (!isUnlimited(maxAi) && safeAiUsed(user) >= maxAi) {
            throw new BadRequestException(
                    ApiResponse.fail("Bạn đã dùng hết lượt AI (" + maxAi + " lượt) của tháng này.").getMessage()
            );
        }
    }


    public static void validateStorageLimit(User user, long newFileSizeBytes) {
        PackageService pkg = getActivePackage(user);

        if (isUnlimited(pkg.getStorageGb())) return;

        long maxStorageBytes = pkg.getStorageGb() * 1024L * 1024L * 1024L;
        long currentUsed = user.getDocuments() == null ? 0
                : user.getDocuments().stream()
                .mapToLong(d -> d.getFileSize() == null ? 0 : d.getFileSize())
                .sum();

        if (currentUsed + newFileSizeBytes > maxStorageBytes) {
            throw new BadRequestException(
                    ApiResponse.fail("Không đủ dung lượng lưu trữ. Gói của bạn tối đa " + pkg.getStorageGb() + "GB.").getMessage()
            );
        }
    }


    public static void validateMaxNotes(User user) {
        PackageService pkg = getActivePackage(user);

        if (isUnlimited(pkg.getMaxNotes())) return;

        int count = user.getNotes() == null ? 0 : user.getNotes().size();
        if (count >= pkg.getMaxNotes()) {
            throw new BadRequestException(
                    ApiResponse.fail("Bạn đã đạt giới hạn tối đa " + pkg.getMaxNotes() + " ghi chú. Vui lòng nâng cấp gói để tạo thêm!").getMessage()
            );
        }
    }


    public static void validateFeatureAccess(User user, String featureCode) {
        PackageService pkg = getActivePackage(user);

        if (!hasFeature(pkg, featureCode)) {
            throw new BadRequestException(
                    ApiResponse.fail("Gói dịch vụ của bạn không hỗ trợ tính năng này. Vui lòng nâng cấp!").getMessage()
            );
        }
    }


    public static void validateMaxDevices(User user, RefreshTokenRepository refreshTokenRepository) {
        PackageService pkg = getActivePackage(user);

        if (isUnlimited(pkg.getMaxDevices())) return;

        long activeDevices = refreshTokenRepository.countByUser(user);
        if (activeDevices >= pkg.getMaxDevices()) {
            throw new BadRequestException(
                    ApiResponse.fail("Tài khoản của bạn đã đạt giới hạn đăng nhập trên " + pkg.getMaxDevices() + " thiết bị cùng lúc.").getMessage()
            );
        }
    }


    public static void incrementAiUsage(User user, UserRepository userRepository) {
        user.setAiUsedThisMonth(safeAiUsed(user) + 1);
        user.setLastAiUsageDate(LocalDateTime.now());
        userRepository.save(user);
    }

    public static void resetAiCounterIfNewMonth(User user, UserRepository userRepository) {
        LocalDateTime now = LocalDateTime.now();

        if (user.getLastAiUsageDate() == null
                || user.getLastAiUsageDate().getMonth() != now.getMonth()
                || user.getLastAiUsageDate().getYear() != now.getYear()) {

            user.setAiUsedThisMonth(0);
            user.setLastAiUsageDate(now);
            userRepository.save(user);
        }
    }


    private static boolean hasFeature(PackageService pkg, String featureCode) {
        if (pkg == null || pkg.getFeatures() == null || featureCode == null) return false;
        return Arrays.stream(pkg.getFeatures().split(","))
                .map(String::trim)
                .anyMatch(f -> f.equalsIgnoreCase(featureCode.trim()));
    }

    private static boolean isUnlimited(Integer value) {
        return value == null || value < 0;
    }

    private static int safeAiUsed(User user) {
        return user.getAiUsedThisMonth() == null ? 0 : user.getAiUsedThisMonth();
    }
}