package org.example.velora.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "documents")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", columnDefinition = "UNIQUEIDENTIFIER", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", columnDefinition = "UNIQUEIDENTIFIER", nullable = false)
    private User user;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "original_name", nullable = false, length = 255)
    private String originalName;

    @Enumerated(EnumType.STRING)
    @Column(name = "file_type", nullable = false, length = 10)
    private FileType fileType;

    @Column(name = "storage_path", nullable = false, length = 500)
    private String storagePath;

    @Column(name = "file_size")
    private Long fileSize;

    /** Nội dung text trích xuất từ PDF/DOCX/TXT — hỗ trợ tiếng Việt */
    @Column(name = "extracted_text", columnDefinition = "NVARCHAR(MAX)")
    private String extractedText;

    @Column(name = "ai_summary", columnDefinition = "NVARCHAR(MAX)")
    private String aiSummary;

    /** Transcript âm thanh sau khi AI phân tích — tiếng Việt */
    @Column(name = "audio_transcript", columnDefinition = "NVARCHAR(MAX)")
    private String audioTranscript;

    /** Độ dài âm thanh (giây) */
    @Column(name = "audio_duration_seconds")
    private Integer audioDurationSeconds;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Status status = Status.PENDING;

    @Column(name = "is_embedded", nullable = false)
    @Builder.Default
    private Boolean isEmbedded = false;

    @CreationTimestamp
    @Column(name = "uploaded_at", updatable = false)
    private LocalDateTime uploadedAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum FileType {
        PDF, DOCX, TXT, AUDIO
    }

    public enum Status {
        PENDING,
        PROCESSING,
        SUCCESS,
        FAILED,
        DONE
    }
}