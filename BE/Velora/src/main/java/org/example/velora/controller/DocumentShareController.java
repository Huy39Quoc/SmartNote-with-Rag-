package org.example.velora.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.example.velora.dto.request.DocumentShareRequest;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.dto.response.DocumentShareResponse;
import org.example.velora.security.UserDetailsImpl;
import org.example.velora.service.DocumentShareService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/document-shares")
@RequiredArgsConstructor
public class DocumentShareController {

    private final DocumentShareService documentShareService;

    @PostMapping("/documents/{documentId}")
    public ResponseEntity<ApiResponse<DocumentShareResponse.Item>> shareDocument(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId user,
            @PathVariable UUID documentId,
            @Valid @RequestBody DocumentShareRequest.Share request
    ) {
        DocumentShareResponse.Item result = documentShareService.shareDocument(
                user.getUserId(),
                documentId,
                request
        );

        return ResponseEntity.ok(
                ApiResponse.ok("Chia sẻ tài liệu thành công", result)
        );
    }

    @GetMapping("/documents/{documentId}")
    public ResponseEntity<ApiResponse<List<DocumentShareResponse.Item>>> getSharesOfDocument(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId user,
            @PathVariable UUID documentId
    ) {
        List<DocumentShareResponse.Item> result = documentShareService.getSharesOfDocument(
                user.getUserId(),
                documentId
        );

        return ResponseEntity.ok(
                ApiResponse.ok(result)
        );
    }

    @GetMapping("/shared-with-me")
    public ResponseEntity<ApiResponse<List<DocumentShareResponse.Item>>> getSharedWithMe(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId user
    ) {
        List<DocumentShareResponse.Item> result = documentShareService.getSharedWithMe(
                user.getUserId()
        );

        return ResponseEntity.ok(
                ApiResponse.ok(result)
        );
    }

    @DeleteMapping("/{shareId}")
    public ResponseEntity<ApiResponse<Void>> revokeShare(
            @AuthenticationPrincipal UserDetailsImpl.UserDetailsWithId user,
            @PathVariable UUID shareId
    ) {
        documentShareService.revokeShare(user.getUserId(), shareId);

        return ResponseEntity.ok(
                ApiResponse.ok("Đã hủy chia sẻ tài liệu", null)
        );
    }
}
