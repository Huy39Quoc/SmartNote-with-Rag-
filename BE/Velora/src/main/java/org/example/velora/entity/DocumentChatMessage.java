package org.example.velora.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Lịch sử hỏi đáp AI của MỘT tài liệu — dùng chung cho chủ sở hữu và những
 * người được chia sẻ (thay vì lưu riêng ở localStorage của từng người như
 * trước đây), để việc chia sẻ tài liệu thực sự có ý nghĩa: mọi người có
 * quyền phù hợp đều thấy cùng 1 luồng hội thoại với AI về tài liệu đó.
 */
@Entity
@Table(name = "document_chat_messages")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DocumentChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "UNIQUEIDENTIFIER", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "document_id", columnDefinition = "UNIQUEIDENTIFIER", nullable = false)
    private Document document;

    /** Người gửi (với role USER) hoặc người đã đặt câu hỏi khiến AI trả lời (với role ASSISTANT). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", columnDefinition = "UNIQUEIDENTIFIER")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Role role;

    @Column(nullable = false, columnDefinition = "NVARCHAR(MAX)")
    private String content;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum Role {
        USER, ASSISTANT
    }
}
