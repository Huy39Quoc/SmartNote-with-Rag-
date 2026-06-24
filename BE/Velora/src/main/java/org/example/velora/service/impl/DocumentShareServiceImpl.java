package org.example.velora.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.velora.dto.PackageValidationDto;
import org.example.velora.dto.request.DocumentShareRequest;
import org.example.velora.dto.response.DocumentShareResponse;
import org.example.velora.entity.Document;
import org.example.velora.entity.DocumentShare;
import org.example.velora.entity.User;
import org.example.velora.exception.BadRequestException;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.repository.DocumentRepository;
import org.example.velora.repository.DocumentShareRepository;
import org.example.velora.repository.UserRepository;
import org.example.velora.service.DocumentShareService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class DocumentShareServiceImpl implements DocumentShareService {

    private final DocumentRepository documentRepository;
    private final DocumentShareRepository documentShareRepository;
    private final UserRepository userRepository;

    @Override
    public DocumentShareResponse.Item shareDocument(
            UUID ownerId,
            UUID documentId,
            DocumentShareRequest.Share request
    ) {
        User owner = getUser(ownerId);

        PackageValidationDto.validateFeatureAccess(owner, "TEAM_WORK");

        Document document = getOwnedDocument(ownerId, documentId);

        String targetEmail = request.getEmail() == null
                ? ""
                : request.getEmail().trim().toLowerCase();

        User targetUser = userRepository.findByEmail(targetEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản nhận chia sẻ"));

        if (targetUser.getId().equals(ownerId)) {
            throw new BadRequestException("Không thể chia sẻ tài liệu cho chính bạn");
        }

        DocumentShare share = documentShareRepository
                .findByDocumentIdAndSharedWithId(documentId, targetUser.getId())
                .orElseGet(() -> DocumentShare.builder()
                        .document(document)
                        .owner(owner)
                        .sharedWith(targetUser)
                        .build());

        share.setPermission(request.getPermission());

        DocumentShare savedShare = documentShareRepository.save(share);

        return toResponse(savedShare);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentShareResponse.Item> getSharesOfDocument(
            UUID ownerId,
            UUID documentId
    ) {
        getOwnedDocument(ownerId, documentId);

        return documentShareRepository
                .findByDocumentIdAndOwnerIdOrderByCreatedAtDesc(documentId, ownerId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentShareResponse.Item> getSharedWithMe(UUID userId) {
        return documentShareRepository
                .findBySharedWithIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    public void revokeShare(UUID ownerId, UUID shareId) {
        DocumentShare share = documentShareRepository.findById(shareId)
                .orElseThrow(() -> new ResourceNotFoundException("Thông tin chia sẻ không tồn tại"));

        if (share.getOwner() == null || !share.getOwner().getId().equals(ownerId)) {
            throw new ResourceNotFoundException("Thông tin chia sẻ không tồn tại");
        }

        documentShareRepository.delete(share);
    }

    private Document getOwnedDocument(UUID ownerId, UUID documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Tài liệu không tồn tại"));

        if (document.getUser() == null || !document.getUser().getId().equals(ownerId)) {
            throw new ResourceNotFoundException("Tài liệu không tồn tại");
        }

        return document;
    }

    private User getUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
    }

    private DocumentShareResponse.Item toResponse(DocumentShare share) {
        Document document = share.getDocument();
        User owner = share.getOwner();
        User sharedWith = share.getSharedWith();

        return DocumentShareResponse.Item.builder()
                .id(share.getId())

                .documentId(document != null ? document.getId() : null)
                .documentName(document != null ? document.getOriginalName() : null)
                .documentFileType(document != null ? document.getFileType() : null)
                .fileSize(document != null ? document.getFileSize() : null)
                .status(document != null ? document.getStatus() : null)

                .ownerId(owner != null ? owner.getId() : null)
                .ownerEmail(owner != null ? owner.getEmail() : null)
                .ownerFullName(owner != null ? owner.getFullName() : null)

                .sharedWithId(sharedWith != null ? sharedWith.getId() : null)
                .sharedWithEmail(sharedWith != null ? sharedWith.getEmail() : null)
                .sharedWithFullName(sharedWith != null ? sharedWith.getFullName() : null)

                .permission(share.getPermission())
                .createdAt(share.getCreatedAt())
                .updatedAt(share.getUpdatedAt())
                .build();
    }
}