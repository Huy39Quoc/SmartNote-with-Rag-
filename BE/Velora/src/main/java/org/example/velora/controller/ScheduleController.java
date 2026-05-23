package org.example.velora.controller;

import org.example.velora.dto.request.ScheduleRequest;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.dto.response.ScheduleResponse;
import org.example.velora.security.UserDetailsImpl;
import org.example.velora.service.ScheduleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController @RequestMapping("/api/schedules") @RequiredArgsConstructor
public class ScheduleController {
    private final ScheduleService scheduleService;

    @PostMapping
    public ResponseEntity<ApiResponse<ScheduleResponse.Item>> create(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @Valid @RequestBody ScheduleRequest.Create req) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.create(u.getUserId(), req)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<ScheduleResponse.Item>>> getAll(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.getAll(u.getUserId())));
    }

    @GetMapping("/priority")
    public ResponseEntity<ApiResponse<ScheduleResponse.PriorityList>> getPriority(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.getPrioritized(u.getUserId())));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ScheduleResponse.Item>> update(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @PathVariable UUID id, @Valid @RequestBody ScheduleRequest.Update req) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.update(u.getUserId(), id, req)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @PathVariable UUID id) {
        scheduleService.delete(u.getUserId(), id);
        return ResponseEntity.ok(ApiResponse.ok("Xoá task thành công", null));
    }

    @PostMapping("/extract")
    public ResponseEntity<ApiResponse<ScheduleResponse.ExtractResult>> extract(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId u,
            @Valid @RequestBody ScheduleRequest.ExtractFromNote req) {
        return ResponseEntity.ok(ApiResponse.ok(scheduleService.extractFromNote(u.getUserId(), req)));
    }
}
