package org.example.velora.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name="activity_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityLog {

    @Id
    @GeneratedValue(strategy=GenerationType.UUID)
    @Column(name = "id", columnDefinition = "UNIQUEIDENTIFIER", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="user_id", columnDefinition = "UNIQUEIDENTIFIER")
    private User user;

    @Column(nullable=false, length=100, columnDefinition = "NVARCHAR(100)")
    private String action;

    @Column(name="entity_type", length=50, columnDefinition = "NVARCHAR(50)")
    private String entityType;

    @Column(name="entity_id", columnDefinition = "UNIQUEIDENTIFIER")
    private UUID entityId;

    @Column(columnDefinition="NVARCHAR(MAX)")
    private String detail;

    @Column(name="ip_address", length=45, columnDefinition = "NVARCHAR(45)")
    private String ipAddress;

    @CreationTimestamp
    @Column(name="created_at", updatable=false)
    private LocalDateTime createdAt;
}