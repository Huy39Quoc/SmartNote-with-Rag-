package org.example.velora.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.velora.dto.request.NoteShareRequest;
import org.example.velora.dto.response.NoteShareResponse;
import org.example.velora.entity.Note;
import org.example.velora.entity.NoteShare;
import org.example.velora.entity.User;
import org.example.velora.exception.BadRequestException;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.repository.NoteRepository;
import org.example.velora.repository.NoteShareRepository;
import org.example.velora.repository.UserRepository;
import org.example.velora.service.NoteCollaborationHandler;
import org.example.velora.service.NoteShareService;
import org.example.velora.service.UserPackageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class NoteShareServiceImpl implements NoteShareService {

    private static final String FEATURE_TEAM_WORK = "TEAM_WORK";

    private final NoteRepository noteRepository;
    private final UserRepository userRepository;
    private final NoteShareRepository noteShareRepository;
    private final UserPackageService userPackageService;
    private final NoteCollaborationHandler noteCollaborationHandler;

    @Override
    public NoteShareResponse.Item shareNote(UUID ownerId, UUID noteId, NoteShareRequest.Share request) {
        User owner = getUser(ownerId);

        userPackageService.checkFeatureAccess(owner, FEATURE_TEAM_WORK);

        Note note = getOwnedNote(ownerId, noteId);

        String targetEmail = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase();
        User targetUser = userRepository.findByEmail(targetEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Khong tim thay tai khoan nhan chia se"));

        if (targetUser.getId().equals(ownerId)) {
            throw new BadRequestException("Khong the chia se ghi chu cho chinh ban");
        }

        NoteShare share = noteShareRepository
                .findByNoteIdAndSharedWithId(noteId, targetUser.getId())
                .orElseGet(() -> NoteShare.builder()
                        .note(note)
                        .owner(owner)
                        .sharedWith(targetUser)
                        .build());

        share.setPermission(request.getPermission());
        NoteShare saved = noteShareRepository.save(share);
        noteCollaborationHandler.updateUserPermission(noteId, targetUser.getId(), saved.getPermission());

        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<NoteShareResponse.Item> getSharesOfNote(UUID ownerId, UUID noteId) {
        getOwnedNote(ownerId, noteId);
        return noteShareRepository.findByNoteIdAndOwnerIdOrderByCreatedAtDesc(noteId, ownerId)
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<NoteShareResponse.Item> getSharedWithMe(UUID userId) {
        return noteShareRepository.findBySharedWithIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toResponse).toList();
    }

    @Override
    public NoteShareResponse.Item updatePermission(
            UUID ownerId,
            UUID shareId,
            NoteShareRequest.UpdatePermission request
    ) {
        User owner = getUser(ownerId);
        userPackageService.checkFeatureAccess(owner, FEATURE_TEAM_WORK);

        NoteShare share = noteShareRepository.findById(shareId)
                .orElseThrow(() -> new ResourceNotFoundException("Thong tin chia se khong ton tai"));

        if (share.getOwner() == null || !share.getOwner().getId().equals(ownerId)) {
            throw new ResourceNotFoundException("Thong tin chia se khong ton tai");
        }

        share.setPermission(request.getPermission());
        NoteShare saved = noteShareRepository.save(share);

        if (saved.getNote() != null && saved.getSharedWith() != null) {
            noteCollaborationHandler.updateUserPermission(
                    saved.getNote().getId(),
                    saved.getSharedWith().getId(),
                    saved.getPermission()
            );
        }

        return toResponse(saved);
    }

    @Override
    public void revokeShare(UUID ownerId, UUID shareId) {
        NoteShare share = noteShareRepository.findById(shareId)
                .orElseThrow(() -> new ResourceNotFoundException("Thong tin chia se khong ton tai"));

        if (share.getOwner() == null || !share.getOwner().getId().equals(ownerId)) {
            throw new ResourceNotFoundException("Thong tin chia se khong ton tai");
        }

        UUID noteId = share.getNote() != null ? share.getNote().getId() : null;
        UUID sharedWithId = share.getSharedWith() != null ? share.getSharedWith().getId() : null;

        noteShareRepository.delete(share);

        if (noteId != null && sharedWithId != null) {
            noteCollaborationHandler.closeUserSessions(noteId, sharedWithId);
        }
    }

    private Note getOwnedNote(UUID ownerId, UUID noteId) {
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Ghi chu khong ton tai"));

        if (note.getUser() == null || !note.getUser().getId().equals(ownerId)) {
            throw new ResourceNotFoundException("Ghi chu khong ton tai");
        }

        return note;
    }

    private User getUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User khong ton tai"));
    }

    private NoteShareResponse.Item toResponse(NoteShare share) {
        Note note = share.getNote();
        User owner = share.getOwner();
        User sharedWith = share.getSharedWith();

        return NoteShareResponse.Item.builder()
                .id(share.getId())
                .noteId(note != null ? note.getId() : null)
                .noteTitle(note != null ? note.getTitle() : null)
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
