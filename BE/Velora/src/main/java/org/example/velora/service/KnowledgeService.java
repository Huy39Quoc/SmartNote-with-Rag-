package org.example.velora.service;

import org.example.velora.dto.request.KnowledgeGroupRequest;
import org.example.velora.dto.response.KnowledgeGroupResponse;

import java.util.List;
import java.util.UUID;

public interface KnowledgeService {

    KnowledgeGroupResponse.Detail create(UUID userId, KnowledgeGroupRequest.Create req);

    KnowledgeGroupResponse.Detail update(UUID userId, UUID groupId, KnowledgeGroupRequest.Update req);

    void delete(UUID userId, UUID groupId);

    List<KnowledgeGroupResponse.Summary> getAll(UUID userId);

    KnowledgeGroupResponse.Detail getById(UUID userId, UUID groupId);

    KnowledgeGroupResponse.ClassifyResult classifyNote(UUID userId, KnowledgeGroupRequest.Classify req);

    List<KnowledgeGroupResponse.Summary> reclassifyAll(UUID userId);

    KnowledgeGroupResponse.FeedbackResult submitClassificationFeedback(
            UUID userId,
            KnowledgeGroupRequest.ClassificationFeedback req
    );

    KnowledgeGroupResponse.FeedbackStats getClassificationFeedbackStats(UUID userId);

    KnowledgeGroupResponse.GraphResult getKnowledgeGraph(UUID userId);
}