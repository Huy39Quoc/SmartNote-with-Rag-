package org.example.velora.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.velora.dto.request.NoteShareRequest;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.dto.response.NoteShareResponse;
import org.example.velora.security.UserDetailsImpl;
import org.example.velora.service.NoteShareService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/note-shares")
@RequiredArgsConstructor
public class NoteShareController {

    private final NoteShareService noteShareService;

    @PostMapping("/notes/{noteId}")
    public ResponseEntity<ApiResponse<NoteShareResponse.Item>> shareNote(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId user,
            @PathVariable UUID noteId,
            @Valid @RequestBody NoteShareRequest.Share request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Chia sẻ ghi chú thành công",
                noteShareService.shareNote(user.getUserId(), noteId, request)
        ));
    }

    @GetMapping("/notes/{noteId}")
    public ResponseEntity<ApiResponse<List<NoteShareResponse.Item>>> getSharesOfNote(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId user,
            @PathVariable UUID noteId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                noteShareService.getSharesOfNote(user.getUserId(), noteId)
        ));
    }

    @GetMapping("/shared-with-me")
    public ResponseEntity<ApiResponse<List<NoteShareResponse.Item>>> getSharedWithMe(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId user
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                noteShareService.getSharedWithMe(user.getUserId())
        ));
    }

    @DeleteMapping("/{shareId}")
    public ResponseEntity<ApiResponse<Void>> revokeShare(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId user,
            @PathVariable UUID shareId
    ) {
        noteShareService.revokeShare(user.getUserId(), shareId);

        return ResponseEntity.ok(ApiResponse.ok(
                "Đã hủy chia sẻ ghi chú",
                null
        ));
    }
}