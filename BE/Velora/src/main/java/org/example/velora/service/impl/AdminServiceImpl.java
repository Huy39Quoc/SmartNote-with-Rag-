package org.example.velora.service.impl;

import org.example.velora.dto.request.PackageServiceRequest;
import org.example.velora.dto.request.UserRequest;
import org.example.velora.dto.response.UserResponse;
import org.example.velora.entity.*;
import org.example.velora.exception.BadRequestException;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.repository.*;
import org.example.velora.service.AdminService;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service @RequiredArgsConstructor @Transactional
public class AdminServiceImpl implements AdminService {

    private final UserRepository userRepository;
    private final NoteRepository noteRepository;
    private final DocumentRepository documentRepository;
    private final SystemPromptRepository systemPromptRepository;
    private final NotificationRepository notificationRepository;
    private final ActivityLogRepository activityLogRepository;
    private  final PackageServiceRepository packageServiceRepository;

    @Override @Transactional(readOnly = true)
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
        if (req.getFullName() != null) user.setFullName(req.getFullName());
        if (req.getRole() != null) user.setRole(req.getRole());
        if (req.getIsActive() != null) user.setIsActive(req.getIsActive());
        return toAdminView(userRepository.save(user));
    }

    @Override
    public void deleteUser(UUID userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
        if (user.getRole() == User.Role.ADMIN)
            throw new BadRequestException("Không thể xoá tài khoản Admin");
        userRepository.delete(user);
    }

    @Override @Transactional(readOnly = true)
    public Object getSystemStats() {
        long totalUsers     = userRepository.count();
        long activeUsers    = userRepository.countByIsActive(true);
        long totalNotes     = noteRepository.count();
        long totalDocuments = documentRepository.count();
        long doneDocuments  = documentRepository.countByStatus(Document.Status.DONE);
        return Map.of(
            "totalUsers",     totalUsers,
            "activeUsers",    activeUsers,
            "totalNotes",     totalNotes,
            "totalDocuments", totalDocuments,
            "doneDocuments",  doneDocuments
        );
    }

    @Override @Transactional(readOnly = true)
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
        List<Notification> notifs = users.stream().map(u ->
            Notification.builder().user(u).title(title)
                .message(message).isBroadcast(true).build()
        ).toList();
        notificationRepository.saveAll(notifs);
    }

    @Override @Transactional(readOnly = true)
    public Object getAiUsageStats() {
        return Map.of("message", "AI usage stats — implement with ActivityLog");
    }

    // Bổ sung hoặc ghi đè vào AdminServiceImpl.java
    @Override
    public PackageService createOrUpdatePackage(PackageServiceRequest request) {
        PackageService pkg = packageServiceRepository.findByName(request.getName())
                .orElse(new PackageService());

        pkg.setName(request.getName());
        pkg.setPriceMonthly(request.getPriceMonthly());
        pkg.setPriceYearly(request.getPriceYearly());
        pkg.setDescription(request.getDescription());
        pkg.setMaxNotes(request.getMaxNotes());
        pkg.setMaxAiFormatsPerMonth(request.getMaxAiFormatsPerMonth());
        pkg.setStorageGb(request.getStorageGb());

        // Chuyển List thành chuỗi phân tách bằng dấu phẩy để lưu DB đơn giản
        if (request.getFeatures() != null) {
            pkg.setFeatures(String.join(",", request.getFeatures()));
        }

        return packageServiceRepository.save(pkg);
    }

    @Override
    public List<PackageService> getAllPackages() {
        return packageServiceRepository.findAll();
    }

    @Override
    public PackageService createPackage(PackageServiceRequest request) {
        if (packageServiceRepository.findByName(request.getName()).isPresent()) {
            throw new BadRequestException("Tên gói dịch vụ này đã tồn tại!");
        }
        PackageService pkg = new PackageService();
        mapRequestToEntity(request, pkg);
        return packageServiceRepository.save(pkg);
    }

    @Override
    public PackageService updatePackage(UUID id, PackageServiceRequest request) {
        PackageService pkg = packageServiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gói dịch vụ yêu cầu."));

        // Kiểm tra trùng tên với gói khác nếu đổi tên
        packageServiceRepository.findByName(request.getName()).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new BadRequestException("Tên gói dịch vụ này đã bị trùng với gói khác!");
            }
        });

        mapRequestToEntity(request, pkg);
        return packageServiceRepository.save(pkg);
    }

    @Override
    public void deletePackage(UUID id) {
        PackageService pkg = packageServiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gói dịch vụ để xóa."));
        packageServiceRepository.delete(pkg);
    }

    private void mapRequestToEntity(PackageServiceRequest request, PackageService pkg) {
        if (request.getPriceMonthly() == null || request.getPriceMonthly() < 0) {
            throw new BadRequestException("Giá tháng không được để trống hoặc nhỏ hơn 0");
        }

        if (request.getPriceYearly() == null || request.getPriceYearly() < 0) {
            throw new BadRequestException("Giá năm không được để trống hoặc nhỏ hơn 0");
        }
        pkg.setName(request.getName());
        pkg.setPriceMonthly(request.getPriceMonthly());
        pkg.setPriceYearly(request.getPriceYearly());
        pkg.setDescription(request.getDescription());
        pkg.setMaxNotes(request.getMaxNotes());
        pkg.setMaxAiFormatsPerMonth(request.getMaxAiFormatsPerMonth());
        pkg.setStorageGb(request.getStorageGb());
        pkg.setMaxDevices(request.getMaxDevices());

        if (request.getFeatures() != null) {
            pkg.setFeatures(String.join(",", request.getFeatures()));
        } else {
            pkg.setFeatures("");
        }
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
