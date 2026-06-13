package org.example.velora.dto.request;

import lombok.Data;
import java.util.List;

@Data
public class PackageServiceRequest {
    private String name;
    private Double priceMonthly;
    private Double priceYearly;
    private String description;
    private Integer maxNotes;
    private Integer maxAiFormatsPerMonth;
    private Integer storageGb;
    private Integer maxDevices;
    private Boolean isActive;
    private List<String> features; // Danh sách các mã quyền hạn ví dụ: ["AI_FLASHCARD", "DEADLINE_MANAGEMENT"]
}