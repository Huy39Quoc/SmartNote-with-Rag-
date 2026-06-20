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

@Service
@RequiredArgsConstructor
public class PackageValidationServiceImpl implements PackageValidationService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;

    @Override
    public void validateAiUsage(User user, String requiredFeature) {
        PackageService pkg = getActivePackage(user);

        // Kiểm tra xem gói có chứa chuỗi tính năng yêu cầu không (vd: "AI_CHAT", "AI_SUMMARY")
        if (pkg.getFeatures() == null || !pkg.getFeatures().contains(requiredFeature)) {
            throw new BadRequestException("Gói dịch vụ của bạn không hỗ trợ tính năng này. Vui lòng nâng cấp!");
        }

        // Reset bộ đếm nếu đã sang tháng mới
        resetAiCounterIfNewMonth(user);

        // Kiểm tra giới hạn số lượt dùng AI
        if (pkg.getMaxAiFormatsPerMonth() != null && user.getAiUsedThisMonth() >= pkg.getMaxAiFormatsPerMonth()) {
            throw new BadRequestException("Bạn đã dùng hết lượt AI (" + pkg.getMaxAiFormatsPerMonth() + " lượt) của tháng này.");
        }
    }

    @Override
    public void validateStorageLimit(User user, long newFileSizeBytes) {
        PackageService pkg = getActivePackage(user);

        if (pkg.getStorageGb() == null) return; // Unlimited

        long maxStorageBytes = pkg.getStorageGb() * 1024L * 1024L * 1024L; // GB to Bytes
        long currentStorageUsed = user.getDocuments().stream()
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
            freePackage.setStorageGb(50);
            freePackage.setMaxNotes(50);
            freePackage.setMaxDevices(2);
            freePackage.setMaxAiFormatsPerMonth(50);
            freePackage.setFeatures("AI_CHAT,AI_SUMMARY,AI_TRANSLATE,EXTRACT_SCHEDULE");

            return freePackage;
        }
        return user.getCurrentPackage();
    }

    @Override
    public void resetAiCounterIfNewMonth(User user) {
        LocalDateTime now = LocalDateTime.now();
        if (user.getLastAiUsageDate() == null || user.getLastAiUsageDate().getMonth() != now.getMonth()) {
            user.setAiUsedThisMonth(0);
            user.setLastAiUsageDate(now);
        }
    }

    @Override
    public void incrementAiUsage(User user) {
        user.setAiUsedThisMonth(user.getAiUsedThisMonth() + 1);
        user.setLastAiUsageDate(LocalDateTime.now());
        userRepository.save(user); // Lưu thẳng vào Database
    }

    @Override
    public void validateMaxNotes(User user) {
        PackageService pkg = getActivePackage(user);
        if (pkg.getMaxNotes() == null) return; // Gói Unlimited thì bỏ qua

        // Đếm số ghi chú hiện có của user
        if (user.getNotes() != null && user.getNotes().size() >= pkg.getMaxNotes()) {
            throw new BadRequestException("Bạn đã đạt giới hạn tối đa " + pkg.getMaxNotes() + " ghi chú. Vui lòng nâng cấp gói Premium để tạo thêm!");
        }
    }

    @Override
    public void validateFeatureAccess(User user, String featureCode) {
        PackageService pkg = getActivePackage(user);
        if (pkg.getFeatures() == null || !pkg.getFeatures().contains(featureCode)) {
            throw new BadRequestException("Gói dịch vụ của bạn không hỗ trợ tính năng này. Vui lòng nâng cấp gói Premium!");
        }
    }

    @Override
    public void validateMaxDevices(User user) {
        PackageService pkg = getActivePackage(user);
        if (pkg.getMaxDevices() == null) return; // Gói Unlimited thì bỏ qua

        // Đếm số lượng session/token đang kích hoạt của user này
        long activeDevices = refreshTokenRepository.countByUser(user);
        if (activeDevices >= pkg.getMaxDevices()) {
            throw new BadRequestException("Tài khoản của bạn đã đạt giới hạn đăng nhập trên " + pkg.getMaxDevices() + " thiết bị cùng lúc. Vui lòng đăng xuất ở thiết bị khác hoặc nâng cấp gói!");
        }
    }
}
