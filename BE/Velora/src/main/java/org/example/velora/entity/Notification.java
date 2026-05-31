package org.example.velora.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name="notifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy=GenerationType.UUID)
    @Column(name = "id", columnDefinition = "UNIQUEIDENTIFIER", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="user_id", columnDefinition = "UNIQUEIDENTIFIER")
    private User user;

    @Column(nullable=false, length=255)
    private String title;

    @Column(nullable=false, columnDefinition="NVARCHAR(MAX)")
    private String message;

    @Column(name="is_broadcast", nullable=false)
    @Builder.Default
    private Boolean isBroadcast = false;

    @Column(name="is_read", nullable=false)
    @Builder.Default
    private Boolean isRead = false;

    @Column(name="created_by", columnDefinition = "UNIQUEIDENTIFIER")
    private UUID createdBy;

    @CreationTimestamp
    @Column(name="created_at", updatable=false)
    private LocalDateTime createdAt;
}