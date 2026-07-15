package org.example.velora.service;

import org.example.velora.dto.request.DocumentShareRequest;
import org.example.velora.dto.response.DocumentShareResponse;

import java.util.List;
import java.util.UUID;

public interface DocumentShareService {

    DocumentShareResponse.Item shareDocument(
            UUID ownerId,
            UUID documentId,
            DocumentShareRequest.Share request
    );

    List<DocumentShareResponse.Item> getSharesOfDocument(
            UUID ownerId,
            UUID documentId
    );

    List<DocumentShareResponse.Item> getSharedWithMe(UUID userId);

    void revokeShare(UUID ownerId, UUID shareId);
}
