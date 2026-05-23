package org.example.velora.service;

import org.example.velora.dto.request.TagRequest;
import org.example.velora.dto.response.TagResponse;
import java.util.List;
import java.util.UUID;

public interface TagService {
    TagResponse.Detail create(UUID userId, TagRequest.Create req);
    TagResponse.Detail update(UUID userId, UUID tagId, TagRequest.Update req);
    void delete(UUID userId, UUID tagId);
    List<TagResponse.Detail> getAll(UUID userId);
}
