package org.example.velora.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.service.UserPackageService;
import org.example.velora.util.VNPayPaymentUtil;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class UserPackageController {

    private final UserPackageService userPackageService;

    @GetMapping("/api/packages/active")
    public ResponseEntity<ApiResponse<Object>> getActivePackages() {
        return ResponseEntity.ok(ApiResponse.ok(
                "Lấy danh sách gói dịch vụ thành công",
                userPackageService.getActivePackages()
        ));
    }

    @PostMapping("/api/packages/buy/{packageId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkoutPackage(
            @PathVariable UUID packageId,
            @RequestParam(defaultValue = "monthly") String type,
            HttpServletRequest request
    ) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String email = auth.getName();
        String clientIp = VNPayPaymentUtil.getIpAddress(request);

        Map<String, Object> checkoutData = userPackageService.checkoutPackage(packageId, type, email, clientIp);

        return ResponseEntity.ok(ApiResponse.ok("Xử lý checkout thành công", checkoutData));
    }

    @GetMapping("/api/packages/vnpay-callback")
    public ResponseEntity<Void> vnpayCallback(
            @RequestParam Map<String, String> params,
            HttpServletResponse response
    ) throws IOException {
        String redirectUrl = userPackageService.handleVNPayCallback(params);

        response.sendRedirect(redirectUrl);
        return ResponseEntity.status(HttpStatus.FOUND).build();
    }
}