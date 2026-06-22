package org.example.velora.service;

import lombok.Builder;
import lombok.Data;

import java.util.UUID;

public interface NoteExportService {

    ExportedFile export(UUID userId, UUID noteId, String format);

    @Data
    @Builder
    class ExportedFile {
        private String fileName;
        private String contentType;
        private byte[] bytes;
    }
}