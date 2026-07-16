package org.example.velora.service;

import org.example.velora.dto.response.FlashcardResponse;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface FlashcardService {

    List<FlashcardResponse> generateFromNote(UUID userId, UUID noteId);

    Map<String, Object> generateFromDocument(UUID userId, UUID documentId);

    List<FlashcardResponse> getByNote(UUID userId, UUID noteId);
}
