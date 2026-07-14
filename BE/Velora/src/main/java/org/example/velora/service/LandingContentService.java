package org.example.velora.service;

import org.example.velora.dto.request.LandingContentRequest;
import org.example.velora.dto.response.LandingContentResponse;

public interface LandingContentService {
    LandingContentResponse getPublished();
    LandingContentResponse getDraft();
    LandingContentResponse saveDraft(LandingContentRequest request);
    LandingContentResponse publish();
}
