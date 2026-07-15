package org.example.velora.dto.response;

import lombok.Builder;
import lombok.Data;
import org.example.velora.entity.NoteShare;

import java.time.LocalDateTime;
import java.util.UUID;

public class NoteShareResponse {

    @Data
    @Builder
    public static class Item {
        private UUID id;

        private UUID noteId;
        private String noteTitle;

        private UUID ownerId;
        private String ownerEmail;
        private String ownerFullName;

        private UUID sharedWithId;
        private String sharedWithEmail;
        private String sharedWithFullName;

        private NoteShare.Permission permission;

        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }
}
