package org.example.velora.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

import java.math.BigDecimal;

public class TransactionRequest {
    @Data
    public static class UpdateStatus {
        @NotBlank private String status;
        @NotBlank @Size(max = 1000) private String note;
    }

    @Data
    public static class Refund {
        @NotNull @DecimalMin(value = "0.01") private BigDecimal amount;
        @NotBlank @Size(max = 255) private String reason;
    }

    @Data
    public static class ExtendSubscription {
        @Min(1) @Max(120) private int months;
        @NotBlank @Size(max = 500) private String reason;
    }

    @Data
    public static class CancelSubscription {
        @NotBlank @Size(max = 500) private String reason;
    }
}
