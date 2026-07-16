package org.example.velora.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "package_service")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PackageService {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String name;

    private Double priceMonthly;
    private Double priceYearly;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String description;

    @Column(name = "max_notes")
    private Integer maxNotes;

    @Column(name = "max_ai_formats_per_month")
    private Integer maxAiFormatsPerMonth;

    @Column(name = "storage_gb")
    private Integer storageGb;

    @Column(name = "max_devices")
    private Integer maxDevices;

    @Column(columnDefinition = "NVARCHAR(MAX)")
    private String features;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;
}
