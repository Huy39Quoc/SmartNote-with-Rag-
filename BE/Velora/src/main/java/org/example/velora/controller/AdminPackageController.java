package org.example.velora.controller;

import lombok.RequiredArgsConstructor;
import org.example.velora.dto.request.PackageServiceRequest;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.entity.PackageService;
import org.example.velora.service.AdminService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class AdminPackageController {

    private final AdminService adminService;

    @GetMapping("/api/admin/packages")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<PackageService>>> getAllPackages() {
        return ResponseEntity.ok(ApiResponse.ok(
                "Lấy danh sách tất cả gói dịch vụ thành công (Admin)",
                adminService.getAllPackages()
        ));
    }

    @PostMapping("/api/admin/packages")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PackageService>> createPackage(@RequestBody PackageServiceRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Tạo gói dịch vụ thành công",
                adminService.createPackage(request)
        ));
    }

    @PutMapping("/api/admin/packages/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PackageService>> updatePackage(
            @PathVariable UUID id,
            @RequestBody PackageServiceRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Cập nhật gói dịch vụ thành công",
                adminService.updatePackage(id, request)
        ));
    }

    @DeleteMapping("/api/admin/packages/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deletePackage(@PathVariable UUID id) {
        adminService.deletePackage(id);
        return ResponseEntity.ok(ApiResponse.ok(
                "Xóa gói dịch vụ thành công",
                null
        ));
    }
}
