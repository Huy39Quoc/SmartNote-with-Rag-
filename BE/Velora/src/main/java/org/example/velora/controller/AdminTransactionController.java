package org.example.velora.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.velora.dto.request.AdminTransactionRequest;
import org.example.velora.dto.response.AdminTransactionResponse;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.service.AdminTransactionService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminTransactionController {
    private final AdminTransactionService service;

    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse<AdminTransactionResponse.Page>> list(
        @RequestParam(required = false) String status,
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        return ResponseEntity.ok(ApiResponse.ok(service.getTransactions(status, keyword, from, to,
            PageRequest.of(Math.max(page, 0), safeSize, Sort.by("createdAt").descending()))));
    }

    @GetMapping("/transactions/{id}")
    public ResponseEntity<ApiResponse<AdminTransactionResponse.Item>> detail(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok(service.getTransaction(id)));
    }

    @GetMapping("/transactions/revenue")
    public ResponseEntity<ApiResponse<AdminTransactionResponse.Revenue>> revenue(
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) { return ResponseEntity.ok(ApiResponse.ok(service.getRevenue(from, to))); }

    @PostMapping("/transactions/{id}/reconcile")
    public ResponseEntity<ApiResponse<AdminTransactionResponse.VnpayResult>> reconcile(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.ok("Đã đối soát với VNPay", service.reconcile(id)));
    }

    @PostMapping("/transactions/{id}/refund")
    public ResponseEntity<ApiResponse<AdminTransactionResponse.VnpayResult>> refund(
        @PathVariable UUID id, @Valid @RequestBody AdminTransactionRequest.Refund request
    ) { return ResponseEntity.ok(ApiResponse.ok("Đã gửi yêu cầu hoàn tiền", service.refund(id, request))); }

    @PutMapping("/transactions/{id}/status")
    public ResponseEntity<ApiResponse<AdminTransactionResponse.Item>> updateStatus(
        @PathVariable UUID id, @Valid @RequestBody AdminTransactionRequest.UpdateStatus request
    ) { return ResponseEntity.ok(ApiResponse.ok("Đã cập nhật giao dịch", service.updateStatus(id, request))); }

    @PostMapping("/users/{id}/subscription/extend")
    public ResponseEntity<ApiResponse<Void>> extend(
        @PathVariable UUID id, @Valid @RequestBody AdminTransactionRequest.ExtendSubscription request
    ) { service.extendSubscription(id, request); return ResponseEntity.ok(ApiResponse.ok("Đã gia hạn gói", null)); }

    @PostMapping("/users/{id}/subscription/cancel")
    public ResponseEntity<ApiResponse<Void>> cancel(
        @PathVariable UUID id, @Valid @RequestBody AdminTransactionRequest.CancelSubscription request
    ) { service.cancelSubscription(id, request); return ResponseEntity.ok(ApiResponse.ok("Đã hủy gói", null)); }
}
