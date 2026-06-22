package org.example.velora.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.service.UserPackageService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class PaymentController {

    private final UserPackageService userPackageService;

    @PostMapping("/api/packages/checkout")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkout(
            @RequestParam UUID packageId,
            @RequestParam String type,
            @AuthenticationPrincipal UserDetails userDetails,
            HttpServletRequest request
    ) {
        String clientIp = request.getRemoteAddr();
        Map<String, Object> result = userPackageService.checkoutPackage(packageId, type, userDetails.getUsername(), clientIp);
        return ResponseEntity.ok(ApiResponse.ok("Khởi tạo thanh toán thành công", result));
    }

    @GetMapping("/api/packages/vnpay-callback")
    public ResponseEntity<Void> vnpayCallback(@RequestParam Map<String, String> allParams) {
        String redirectUrl = userPackageService.handleVNPayCallback(allParams);
        HttpHeaders headers = new HttpHeaders();
        headers.setLocation(URI.create(redirectUrl));
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }
}