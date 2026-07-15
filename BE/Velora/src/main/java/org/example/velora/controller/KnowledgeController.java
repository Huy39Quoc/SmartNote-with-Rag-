package org.example.velora.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.velora.dto.request.KnowledgeGroupRequest;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.dto.response.KnowledgeGroupResponse;
import org.example.velora.security.UserDetailsImpl;
import org.example.velora.service.KnowledgeService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/knowledge")
@RequiredArgsConstructor
public class KnowledgeController {

    private final KnowledgeService knowledgeService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<KnowledgeGroupResponse.Summary>>> getAll(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId user
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                knowledgeService.getAll(user.getUserId())
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<KnowledgeGroupResponse.Detail>> getById(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId user,
            @PathVariable UUID id
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                knowledgeService.getById(user.getUserId(), id)
        ));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<KnowledgeGroupResponse.Detail>> create(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId user,
            @Valid @RequestBody KnowledgeGroupRequest.Create req
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                knowledgeService.create(user.getUserId(), req)
        ));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<KnowledgeGroupResponse.Detail>> update(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId user,
            @PathVariable UUID id,
            @Valid @RequestBody KnowledgeGroupRequest.Update req
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                knowledgeService.update(user.getUserId(), id, req)
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId user,
            @PathVariable UUID id
    ) {
        knowledgeService.delete(user.getUserId(), id);
        return ResponseEntity.ok(ApiResponse.ok("Xoá nhóm thành công", null));
    }

    @PostMapping("/classify")
    public ResponseEntity<ApiResponse<KnowledgeGroupResponse.ClassifyResult>> classify(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId user,
            @Valid @RequestBody KnowledgeGroupRequest.Classify req
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                knowledgeService.classifyNote(user.getUserId(), req)
        ));
    }

    @PostMapping("/reclassify")
    public ResponseEntity<ApiResponse<List<KnowledgeGroupResponse.Summary>>> reclassify(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId user
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                knowledgeService.reclassifyAll(user.getUserId())
        ));
    }

    @PostMapping("/classification-feedback")
    public ResponseEntity<ApiResponse<KnowledgeGroupResponse.FeedbackResult>> submitClassificationFeedback(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId user,
            @Valid @RequestBody KnowledgeGroupRequest.ClassificationFeedback req
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                knowledgeService.submitClassificationFeedback(user.getUserId(), req)
        ));
    }

    @GetMapping("/classification-feedback/stats")
    public ResponseEntity<ApiResponse<KnowledgeGroupResponse.FeedbackStats>> getClassificationFeedbackStats(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId user
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                knowledgeService.getClassificationFeedbackStats(user.getUserId())
        ));
    }

    @GetMapping("/graph")
    public ResponseEntity<ApiResponse<KnowledgeGroupResponse.GraphResult>> getKnowledgeGraph(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId user
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                knowledgeService.getKnowledgeGraph(user.getUserId())
        ));
    }
}
