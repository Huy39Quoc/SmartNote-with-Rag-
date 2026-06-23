
package org.example.velora.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.velora.dto.PackageValidationDto;
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
import org.example.velora.service.NoteShareService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class NoteShareServiceImpl implements NoteShareService {

    private final NoteRepository noteRepository;
    private final UserRepository userRepository;
    private final NoteShareRepository noteShareRepository;

    @Override
    public NoteShareResponse.Item shareNote(UUID ownerId, UUID noteId, NoteShareRequest.Share request) {
        User owner = getUser(ownerId);

        PackageValidationDto.validateFeatureAccess(owner, "TEAM_WORK");

        Note note = getOwnedNote(ownerId, noteId);

        String targetEmail = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase();
        User targetUser = userRepository.findByEmail(targetEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản nhận chia sẻ"));

        if (targetUser.getId().equals(ownerId))
            throw new BadRequestException("Không thể chia sẻ ghi chú cho chính bạn");

        NoteShare share = noteShareRepository
                .findByNoteIdAndSharedWithId(noteId, targetUser.getId())
                .orElseGet(() -> NoteShare.builder()
                        .note(note).owner(owner).sharedWith(targetUser).build());

        share.setPermission(request.getPermission());
        return toResponse(noteShareRepository.save(share));
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
    public void revokeShare(UUID ownerId, UUID shareId) {
        NoteShare share = noteShareRepository.findById(shareId)
                .orElseThrow(() -> new ResourceNotFoundException("Thông tin chia sẻ không tồn tại"));
        if (share.getOwner() == null || !share.getOwner().getId().equals(ownerId))
            throw new ResourceNotFoundException("Thông tin chia sẻ không tồn tại");
        noteShareRepository.delete(share);
    }

    private Note getOwnedNote(UUID ownerId, UUID noteId) {
        Note note = noteRepository.findById(noteId)
                .orElseThrow(() -> new ResourceNotFoundException("Ghi chú không tồn tại"));
        if (note.getUser() == null || !note.getUser().getId().equals(ownerId))
            throw new ResourceNotFoundException("Ghi chú không tồn tại");
        return note;
    }

    private User getUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
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