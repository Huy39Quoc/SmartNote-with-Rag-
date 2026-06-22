package org.example.velora.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.repository.PackageServiceRepository;
import org.example.velora.service.PaymentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/packages")
public class UserPackageController {

    private final PackageServiceRepository packageServiceRepository;
    private final PaymentService paymentService;

    @GetMapping("/active")
    public ResponseEntity<ApiResponse<?>> getActivePackages() {
        return ResponseEntity.ok(
                ApiResponse.ok(packageServiceRepository.findByIsActiveTrue())
        );
    }

    @PostMapping("/buy/{packageId}")
    public ResponseEntity<ApiResponse<?>> checkoutPackage(
            @PathVariable UUID packageId,
            @RequestParam(defaultValue = "monthly") String type,
            HttpServletRequest request
    ) {
        ApiResponse<?> result = paymentService.checkout(packageId, type, request);
        return ResponseEntity.ok(result);
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