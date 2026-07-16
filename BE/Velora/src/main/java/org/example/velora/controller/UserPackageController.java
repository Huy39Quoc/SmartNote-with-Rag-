package org.example.velora.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.entity.PackageService;
import org.example.velora.service.UserPackageService;
import org.example.velora.service.PaymentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/packages")
public class UserPackageController {

    private final UserPackageService userPackageService;
    private final PaymentService paymentService;

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<List<PackageService>>> getActivePackages() {
        return ResponseEntity.ok(ApiResponse.ok(
                "Lấy danh sách gói dịch vụ thành công",
                userPackageService.getActivePackages()
        ));
    }

    @PostMapping("/buy/{packageId}")
    public ResponseEntity<ApiResponse<?>> checkoutPackage(
            @PathVariable UUID packageId,
            @RequestParam(defaultValue = "monthly") String type,
            HttpServletRequest request
    ) {
        return ResponseEntity.ok(paymentService.checkout(packageId, type, request));
    }

    @GetMapping("/vnpay-callback")
    public ResponseEntity<Void> vnpayCallback(
            @RequestParam Map<String, String> params,
            HttpServletResponse response
    ) throws IOException {
        String redirectUrl = paymentService.handleVnpayCallback(params);
        response.sendRedirect(redirectUrl);
        return ResponseEntity.status(HttpStatus.FOUND).build();
    }
}
