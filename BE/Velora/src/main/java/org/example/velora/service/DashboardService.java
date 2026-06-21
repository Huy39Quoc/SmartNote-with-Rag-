package org.example.velora.service;

import org.example.velora.dto.response.DashboardResponse;

import java.util.UUID;

public interface DashboardService {

    DashboardResponse.StudyProgress getStudyProgress(UUID userId);
}