package org.example.velora.dto.response;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class AdminTransactionResponse {
    @Data @Builder
    public static class Item {
        private UUID id;
        private String txnRef;
        private String vnpayTranNo;
        private UUID userId;
        private String userEmail;
        private String userName;
        private UUID packageId;
        private String packageName;
        private String billingType;
        private BigDecimal amount;
        private String status;
        private String responseCode;
        private String bankCode;
        private LocalDateTime payDate;
        private BigDecimal refundAmount;
        private LocalDateTime refundedAt;
        private String adminNote;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data @Builder
    public static class Page {
        private List<Item> content;
        private int pageNumber;
        private int pageSize;
        private long totalElements;
        private int totalPages;
    }

    @Data @Builder
    public static class Revenue {
        private BigDecimal grossRevenue;
        private BigDecimal refundedAmount;
        private BigDecimal netRevenue;
        private long successfulTransactions;
        private Map<String, BigDecimal> byDay;
        private Map<String, BigDecimal> byMonth;
        private Map<String, BigDecimal> byPackage;
    }

    @Data @Builder
    public static class VnpayResult {
        private String responseCode;
        private String message;
        private String transactionStatus;
        private String transactionType;
        private Map<String, String> raw;
    }
}
