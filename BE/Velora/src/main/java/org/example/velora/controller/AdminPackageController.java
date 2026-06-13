package org.example.velora.controller;

import lombok.RequiredArgsConstructor;
import org.example.velora.dto.request.PackageServiceRequest;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.entity.PackageService;
import org.example.velora.repository.PackageServiceRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/packages")
@RequiredArgsConstructor
public class AdminPackageController {

    private final PackageServiceRepository packageServiceRepository;

    @GetMapping
    public ResponseEntity<?> getAllPackages() {
        try {
            var packages = packageServiceRepository.findAll();
            return ResponseEntity.ok(ApiResponse.ok("Lấy danh sách gói dịch vụ thành công", packages));
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(ApiResponse.fail("Lỗi khi lấy danh sách gói dịch vụ: " + e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createPackage(@RequestBody PackageServiceRequest request) {
        // Validate: Check if package with same name already exists
        if (packageServiceRepository.findByName(request.getName()).isPresent()) {
            return ResponseEntity.badRequest().body(
                ApiResponse.fail("Gói dịch vụ với tên '" + request.getName() + "' đã tồn tại trong hệ thống")
            );
        }

        PackageService newPkg = PackageService.builder()
                .name(request.getName())
                .description(request.getDescription())
                .priceMonthly(request.getPriceMonthly())
                .priceYearly(request.getPriceYearly())
                .maxNotes(request.getMaxNotes())
                .maxAiFormatsPerMonth(request.getMaxAiFormatsPerMonth())
                .storageGb(request.getStorageGb())
                .maxDevices(request.getMaxDevices())
                .features(request.getFeatures() != null ? String.join(",", request.getFeatures()) : "")
                .isActive(request.getIsActive() != null ? request.getIsActive() : true) // Gán dữ liệu trạng thái mới
                .build();

        PackageService saved = packageServiceRepository.save(newPkg);
        return ResponseEntity.ok(ApiResponse.ok("Tạo gói dịch vụ thành công", saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updatePackage(@PathVariable UUID id, @RequestBody PackageServiceRequest request) {
        PackageService pkg = packageServiceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Package không tồn tại"));

        pkg.setName(request.getName());
        pkg.setDescription(request.getDescription());
        pkg.setPriceMonthly(request.getPriceMonthly());
        pkg.setPriceYearly(request.getPriceYearly());
        pkg.setMaxNotes(request.getMaxNotes());
        pkg.setMaxAiFormatsPerMonth(request.getMaxAiFormatsPerMonth());
        pkg.setStorageGb(request.getStorageGb());
        pkg.setMaxDevices(request.getMaxDevices());
        pkg.setFeatures(request.getFeatures() != null ? String.join(",", request.getFeatures()) : "");

        // Cập nhật trạng thái nếu Admin truyền lên thay đổi
        if (request.getIsActive() != null) {
            pkg.setIsActive(request.getIsActive());
        }

        PackageService updated = packageServiceRepository.save(pkg);
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật gói dịch vụ thành công", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePackage(@PathVariable UUID id) {
        PackageService pkg = packageServiceRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Package không tồn tại"));

        packageServiceRepository.delete(pkg);
        return ResponseEntity.ok(ApiResponse.ok("Xóa gói dịch vụ thành công", null));
    }
}