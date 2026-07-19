package org.example.velora.service.impl;

import org.example.velora.dto.request.PackageServiceRequest;
import org.example.velora.dto.request.UserRequest;
import org.example.velora.dto.response.UserResponse;
import org.example.velora.entity.*;
import org.example.velora.exception.BadRequestException;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.repository.*;
import org.example.velora.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminServiceImpl implements AdminService {

    private final UserRepository userRepository;
    private final NoteRepository noteRepository;
    private final DocumentRepository documentRepository;
    private final SystemPromptRepository systemPromptRepository;
    private final NotificationRepository notificationRepository;
    private final ActivityLogRepository activityLogRepository;
    private final PackageServiceRepository packageServiceRepository;
    private final PackageTransactionRepository packageTransactionRepository;

    private static final Set<String> SYSTEM_PACKAGE_NAMES = Set.of(
            "FREE", "PRO", "PLUS"
    );

    private static final Set<String> KNOWN_FEATURE_CODES = Set.of(
            "TAG_SUBJECT",
            "CHECKLIST_BASIC",
            "AI_NOTE_FORMAT",
            "AI_SUMMARY_BASIC",
            "AI_SUMMARY_ADVANCED",
            "AI_CHAT",
            "AI_ANALYZE",
            "AI_AUDIO",
            "DOCUMENT_UPLOAD",
            "EXTRACT_SCHEDULE",
            "AI_FLASHCARD",
            "DEADLINE_MANAGEMENT",
            "PRIORITY_SUGGESTION",
            "EXPORT_FILE",
            "TEAM_WORK",
            "SHARE_DOCUMENT",
            "AI_PROGRESS_ANALYTICS",
            "TEAM_DASHBOARD",
            "GOOGLE_CALENDAR",
            "MANAGE_MEMBERS",
            "CUSTOM_WORKSPACE",
            "PRIORITY_SUPPORT"
    );

    @Override
    @Transactional(readOnly = true)
    public UserResponse.Page getUsers(String keyword, Pageable pageable) {
        Page<User> page = StringUtils.hasText(keyword)
                ? userRepository.findByEmailContainingIgnoreCaseOrFullNameContainingIgnoreCase(keyword, keyword, pageable)
                : userRepository.findAll(pageable);
        return UserResponse.Page.builder()
                .content(page.getContent().stream().map(this::toAdminView).toList())
                .pageNumber(page.getNumber()).pageSize(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages()).last(page.isLast()).build();
    }

    @Override
    public UserResponse.AdminView updateUser(UUID userId, UserRequest.AdminUpdate req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
        if (req.getFullName() != null) {
            user.setFullName(req.getFullName());
        }
        if (req.getRole() != null) {
            user.setRole(req.getRole());
        }
        if (req.getIsActive() != null) {
            user.setIsActive(req.getIsActive());
        }
        return toAdminView(userRepository.save(user));
    }

    @Override
    public void deleteUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
        if (user.getRole() == User.Role.ADMIN) {
            throw new BadRequestException("Không thể xoá tài khoản Admin");
        }
        userRepository.delete(user);
    }

    @Override
    @Transactional(readOnly = true)
    public Object getSystemStats() {
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByIsActive(true);
        long totalNotes = noteRepository.count();
        long totalDocuments = documentRepository.count();
        long doneDocuments = documentRepository.countByStatus(Document.Status.DONE);
        return Map.of(
                "totalUsers", totalUsers,
                "activeUsers", activeUsers,
                "totalNotes", totalNotes,
                "totalDocuments", totalDocuments,
                "doneDocuments", doneDocuments
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<SystemPrompt> getSystemPrompts() {
        return systemPromptRepository.findAllByOrderByPromptKeyAsc();
    }

    @Override
    public SystemPrompt updateSystemPrompt(UUID promptId, String promptText) {
        SystemPrompt sp = systemPromptRepository.findById(promptId)
                .orElseThrow(() -> new ResourceNotFoundException("Prompt không tồn tại"));
        sp.setPromptText(promptText);
        return systemPromptRepository.save(sp);
    }

    @Override
    public void broadcast(String title, String message) {
        List<User> users = userRepository.findAll();
        List<Notification> notifs = users.stream().map(u
                -> Notification.builder().user(u).title(title)
                        .message(message).isBroadcast(true).build()
        ).toList();
        notificationRepository.saveAll(notifs);
    }

    @Override
    @Transactional(readOnly = true)
    public Object getAiUsageStats() {
        return Map.of("message", "AI usage stats — implement with ActivityLog");
    }

    @Override
    public PackageService createOrUpdatePackage(PackageServiceRequest request) {
        String normalizedName = normalizePackageName(request.getName());

        return packageServiceRepository.findByName(normalizedName)
                .map(existing -> updatePackage(existing.getId(), request))
                .orElseGet(() -> createPackage(request));
    }

    @Override
    public List<PackageService> getAllPackages() {
        return packageServiceRepository.findAll();
    }

    @Override
    public PackageService createPackage(PackageServiceRequest request) {
        validatePackageBeforeSave(request, null);

        PackageService pkg = new PackageService();
        mapRequestToEntity(request, pkg);

        return packageServiceRepository.save(pkg);
    }

    @Override
    public PackageService updatePackage(UUID id, PackageServiceRequest request) {
        PackageService pkg = packageServiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gói dịch vụ yêu cầu."));

        validatePackageBeforeSave(request, id);
        mapRequestToEntity(request, pkg);

        return packageServiceRepository.save(pkg);
    }

    @Override
    public void deletePackage(UUID id) {
        PackageService pkg = packageServiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gói dịch vụ để xóa."));

        String packageName = normalizePackageName(pkg.getName());

        if (SYSTEM_PACKAGE_NAMES.contains(packageName)) {
            throw new BadRequestException(
                    "Không thể xóa gói hệ thống " + packageName + ". Bạn chỉ nên chỉnh sửa thông tin gói này."
            );
        }

        long currentUserCount = userRepository.countByCurrentPackage_Id(id);
        long transactionCount = packageTransactionRepository.countByPackageService_Id(id);

        if (currentUserCount > 0 || transactionCount > 0) {
            throw new BadRequestException(
                    "Không thể xóa gói \"" + pkg.getName() + "\" vì gói này đang có "
                    + currentUserCount + " người dùng sử dụng và "
                    + transactionCount + " giao dịch liên quan. "
                    + "Để tránh mất dữ liệu lịch sử thanh toán, hãy ngừng hiển thị hoặc chỉnh sửa gói thay vì xóa trực tiếp."
            );
        }

        packageServiceRepository.delete(pkg);
    }

    private void validatePackageBeforeSave(PackageServiceRequest request, UUID editingId) {
        String normalizedName = normalizePackageName(request.getName());
        request.setName(normalizedName);

        validateMoney("Giá tháng", request.getPriceMonthly());
        validateMoney("Giá năm", request.getPriceYearly());

        validateLimit("Số ghi chú tối đa", request.getMaxNotes());
        validateLimit("Lượt AI Format/tháng", request.getMaxAiFormatsPerMonth());
        validateStorage(request.getStorageGb());
        validateLimit("Số thiết bị", request.getMaxDevices());

        List<String> normalizedFeatures = normalizeFeatureList(request.getFeatures());

        if (normalizedFeatures.isEmpty()) {
            throw new BadRequestException("Vui lòng chọn ít nhất 1 tính năng cho gói dịch vụ.");
        }

        request.setFeatures(normalizedFeatures);

        packageServiceRepository.findByName(normalizedName).ifPresent(existing -> {
            boolean isAnotherPackage = editingId == null || !existing.getId().equals(editingId);

            if (isAnotherPackage) {
                throw new BadRequestException("Tên gói dịch vụ \"" + normalizedName + "\" đã tồn tại.");
            }
        });

        Set<String> newFeatureSet = new LinkedHashSet<>(normalizedFeatures);

        List<PackageService> otherPackages = packageServiceRepository.findAll()
                .stream()
                .filter(pkg -> editingId == null || !pkg.getId().equals(editingId))
                .toList();

        for (PackageService existing : otherPackages) {
            Set<String> existingFeatureSet = toFeatureSet(existing.getFeatures());

            if (!existingFeatureSet.isEmpty() && existingFeatureSet.equals(newFeatureSet)) {
                throw new BadRequestException(
                        "Bộ tính năng của gói này đang trùng hoàn toàn với gói \""
                        + existing.getName()
                        + "\". Vui lòng thay đổi tính năng hoặc chỉnh sửa gói hiện có."
                );
            }

            validatePriceByFeatureCount(request, normalizedName, newFeatureSet, existing);
        }

    }

    private void validatePriceByFeatureCount(
            PackageServiceRequest request,
            String normalizedName,
            Set<String> newFeatureSet,
            PackageService existing
    ) {
        Set<String> existingFeatureSet = toFeatureSet(existing.getFeatures());

        if (existingFeatureSet.isEmpty() || newFeatureSet.isEmpty()) {
            return;
        }

        int newFeatureCount = newFeatureSet.size();
        int existingFeatureCount = existingFeatureSet.size();

        boolean monthlyPriceNotLower
                = safeDouble(request.getPriceMonthly()) >= safeDouble(existing.getPriceMonthly());

        boolean yearlyPriceNotLower
                = safeDouble(request.getPriceYearly()) >= safeDouble(existing.getPriceYearly());

        boolean priceNotLower = monthlyPriceNotLower || yearlyPriceNotLower;

        if (!priceNotLower) {
            return;
        }

        boolean existingHasMoreFeatures = existingFeatureCount > newFeatureCount;

        boolean sameFeatureCount = existingFeatureCount == newFeatureCount;

        boolean existingHasAllLimitsAtLeast
                = compareLimit(existing.getMaxNotes(), request.getMaxNotes()) >= 0
                && compareLimit(existing.getMaxAiFormatsPerMonth(), request.getMaxAiFormatsPerMonth()) >= 0
                && compareLimit(existing.getStorageGb(), request.getStorageGb()) >= 0
                && compareLimit(existing.getMaxDevices(), request.getMaxDevices()) >= 0;

        boolean existingHasAnyBetterLimit
                = compareLimit(existing.getMaxNotes(), request.getMaxNotes()) > 0
                || compareLimit(existing.getMaxAiFormatsPerMonth(), request.getMaxAiFormatsPerMonth()) > 0
                || compareLimit(existing.getStorageGb(), request.getStorageGb()) > 0
                || compareLimit(existing.getMaxDevices(), request.getMaxDevices()) > 0;

        if (existingHasMoreFeatures) {
            throw new BadRequestException(
                    "Gói \"" + normalizedName + "\" có "
                    + newFeatureCount + " tính năng, ít hơn gói \""
                    + existing.getName() + "\" có "
                    + existingFeatureCount + " tính năng, nhưng giá lại không thấp hơn. "
                    + "Vui lòng giảm giá hoặc bổ sung thêm tính năng."
            );
        }

        if (sameFeatureCount && existingHasAllLimitsAtLeast && existingHasAnyBetterLimit) {
            throw new BadRequestException(
                    "Gói \"" + normalizedName + "\" có cùng số lượng tính năng với gói \""
                    + existing.getName()
                    + "\" nhưng giới hạn sử dụng thấp hơn hoặc bằng, trong khi giá lại không thấp hơn. "
                    + "Vui lòng giảm giá hoặc tăng giới hạn sử dụng."
            );
        }
    }

    private void mapRequestToEntity(PackageServiceRequest request, PackageService pkg) {
        List<String> normalizedFeatures = normalizeFeatureList(request.getFeatures());

        pkg.setName(normalizePackageName(request.getName()));
        pkg.setPriceMonthly(request.getPriceMonthly());
        pkg.setPriceYearly(request.getPriceYearly());
        pkg.setDescription(request.getDescription());
        pkg.setMaxNotes(request.getMaxNotes());
        pkg.setMaxAiFormatsPerMonth(request.getMaxAiFormatsPerMonth());
        pkg.setStorageGb(request.getStorageGb());
        pkg.setMaxDevices(request.getMaxDevices());
        pkg.setFeatures(String.join(",", normalizedFeatures));
        pkg.setIsActive(request.getIsActive() == null || request.getIsActive());
    }

    private String normalizePackageName(String name) {
        if (!StringUtils.hasText(name)) {
            throw new BadRequestException("Tên gói dịch vụ không được để trống.");
        }

        return name.trim().toUpperCase();
    }

    private void validateMoney(String fieldName, Double value) {
        if (value == null || value < 0) {
            throw new BadRequestException(fieldName + " không được để trống hoặc nhỏ hơn 0.");
        }
    }

    private void validateLimit(String fieldName, Integer value) {
        if (value == null) {
            throw new BadRequestException(fieldName + " không được để trống. Dùng -1 nếu muốn vô hạn.");
        }

        if (value < -1) {
            throw new BadRequestException(fieldName + " chỉ được nhập -1 hoặc số lớn hơn/bằng 0.");
        }
    }

    private void validateStorage(Integer value) {
        if (value == null || value < 0) {
            throw new BadRequestException("Dung lượng lưu trữ không được để trống hoặc nhỏ hơn 0.");
        }
    }

    private List<String> normalizeFeatureList(List<String> features) {
        if (features == null) {
            return List.of();
        }

        List<String> normalized = features.stream()
                .filter(StringUtils::hasText)
                .map(item -> item.trim().toUpperCase())
                .collect(Collectors.collectingAndThen(
                        Collectors.toCollection(LinkedHashSet::new),
                        List::copyOf
                ));

        List<String> invalidFeatures = normalized.stream()
                .filter(feature -> !KNOWN_FEATURE_CODES.contains(feature))
                .toList();

        if (!invalidFeatures.isEmpty()) {
            throw new BadRequestException("Tính năng không hợp lệ: " + String.join(", ", invalidFeatures));
        }

        return normalized;
    }

    private Set<String> toFeatureSet(String features) {
        if (!StringUtils.hasText(features)) {
            return Set.of();
        }

        return Arrays.stream(features.split(","))
                .filter(StringUtils::hasText)
                .map(item -> item.trim().toUpperCase())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private boolean containsAllKnownFeatures(Set<String> featureSet) {
        return featureSet != null && featureSet.containsAll(KNOWN_FEATURE_CODES);
    }

    private boolean packageCoversRequest(PackageService container, PackageServiceRequest target) {
        if (container == null || target == null) {
            return false;
        }

        Set<String> containerFeatures = toFeatureSet(container.getFeatures());
        Set<String> targetFeatures = new LinkedHashSet<>(normalizeFeatureList(target.getFeatures()));

        boolean hasAllFeatures = containerFeatures.containsAll(targetFeatures);

        boolean hasEnoughLimits
                = compareLimit(container.getMaxNotes(), target.getMaxNotes()) >= 0
                && compareLimit(container.getMaxAiFormatsPerMonth(), target.getMaxAiFormatsPerMonth()) >= 0
                && compareLimit(container.getStorageGb(), target.getStorageGb()) >= 0
                && compareLimit(container.getMaxDevices(), target.getMaxDevices()) >= 0;

        return hasAllFeatures && hasEnoughLimits;
    }

    private boolean requestCoversPackage(PackageServiceRequest container, PackageService target) {
        if (container == null || target == null) {
            return false;
        }

        Set<String> containerFeatures = new LinkedHashSet<>(normalizeFeatureList(container.getFeatures()));
        Set<String> targetFeatures = toFeatureSet(target.getFeatures());

        boolean hasAllFeatures = containerFeatures.containsAll(targetFeatures);

        boolean hasEnoughLimits
                = compareLimit(container.getMaxNotes(), target.getMaxNotes()) >= 0
                && compareLimit(container.getMaxAiFormatsPerMonth(), target.getMaxAiFormatsPerMonth()) >= 0
                && compareLimit(container.getStorageGb(), target.getStorageGb()) >= 0
                && compareLimit(container.getMaxDevices(), target.getMaxDevices()) >= 0;

        return hasAllFeatures && hasEnoughLimits;
    }

    private int compareLimit(Integer left, Integer right) {
        long leftValue = toComparableLimit(left);
        long rightValue = toComparableLimit(right);

        return Long.compare(leftValue, rightValue);
    }

    private long toComparableLimit(Integer value) {
        if (value == null || value < 0) {
            return Long.MAX_VALUE;
        }

        return value;
    }

    private double safeDouble(Double value) {
        return value == null ? 0D : value;
    }

    private UserResponse.AdminView toAdminView(User u) {
        return UserResponse.AdminView.builder()
                .id(u.getId()).email(u.getEmail()).fullName(u.getFullName())
                .role(u.getRole()).isActive(u.getIsActive())
                .noteCount((int) noteRepository.countByUserId(u.getId()))
                .documentCount((int) documentRepository.countByUserId(u.getId()))
                .createdAt(u.getCreatedAt()).updatedAt(u.getUpdatedAt()).build();
    }

}
