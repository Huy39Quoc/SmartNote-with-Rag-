package org.example.velora.controller;

import lombok.RequiredArgsConstructor;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.dto.response.DashboardResponse;
import org.example.velora.security.UserDetailsImpl;
import org.example.velora.service.DashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/study-progress")
    public ResponseEntity<ApiResponse<DashboardResponse.StudyProgress>> getStudyProgress(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId user
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                dashboardService.getStudyProgress(user.getUserId())
        ));
    }
}
