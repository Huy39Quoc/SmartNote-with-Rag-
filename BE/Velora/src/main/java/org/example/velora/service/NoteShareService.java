package org.example.velora.service;

import org.example.velora.dto.request.NoteShareRequest;
import org.example.velora.dto.response.NoteShareResponse;

import java.util.List;
import java.util.UUID;

public interface NoteShareService {

    NoteShareResponse.Item shareNote(UUID ownerId, UUID noteId, NoteShareRequest.Share request);

    List<NoteShareResponse.Item> getSharesOfNote(UUID ownerId, UUID noteId);

    List<NoteShareResponse.Item> getSharedWithMe(UUID userId);

    void revokeShare(UUID ownerId, UUID shareId);
}