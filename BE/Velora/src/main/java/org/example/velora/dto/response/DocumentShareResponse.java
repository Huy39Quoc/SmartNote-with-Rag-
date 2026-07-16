package org.example.velora.dto.response;

import lombok.Builder;
import lombok.Data;
import org.example.velora.entity.Document;
import org.example.velora.entity.DocumentShare;

import java.time.LocalDateTime;
import java.util.UUID;

public class DocumentShareResponse {

    @Data
    @Builder
    public static class Item {

        private UUID id;

        private UUID documentId;
        private String documentName;
        private Document.FileType documentFileType;
        private Long fileSize;
        private Document.Status status;

        private UUID ownerId;
        private String ownerEmail;
        private String ownerFullName;

        private UUID sharedWithId;
        private String sharedWithEmail;
        private String sharedWithFullName;

        private DocumentShare.Permission permission;

        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }
}
