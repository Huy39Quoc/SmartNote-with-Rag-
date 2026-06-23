package org.example.velora.service.impl;

import org.example.velora.dto.PackageValidationDto;
import org.example.velora.dto.request.KnowledgeGroupRequest;
import org.example.velora.dto.response.KnowledgeGroupResponse;
import org.example.velora.dto.response.NoteResponse;
import org.example.velora.entity.KnowledgeGroup;
import org.example.velora.entity.Note;
import org.example.velora.entity.User;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.mapper.NoteMapper;
import org.example.velora.repository.KnowledgeGroupRepository;
import org.example.velora.repository.NoteRepository;
import org.example.velora.repository.UserRepository;
import org.example.velora.service.AiService;
import org.example.velora.service.KnowledgeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class KnowledgeServiceImpl implements KnowledgeService {

    private final KnowledgeGroupRepository groupRepository;
    private final NoteRepository noteRepository;
    private final UserRepository userRepository;
    private final AiService aiService;
    private final NoteMapper noteMapper;

    @Override
    public KnowledgeGroupResponse.Detail create(UUID userId, KnowledgeGroupRequest.Create req) {
        User user = getUser(userId);

        PackageValidationDto.validateFeatureAccess(user, "GROUP_MANAGEMENT");

        List<Note> notes = req.getNoteIds() != null
                ? noteRepository.findAllById(req.getNoteIds()) : List.of();

        KnowledgeGroup group = KnowledgeGroup.builder()
                .user(user).groupName(req.getGroupName()).notes(notes).build();

        return toDetail(groupRepository.save(group));
    }

    @Override
    public KnowledgeGroupResponse.Detail update(UUID userId, UUID groupId, KnowledgeGroupRequest.Update req) {
        KnowledgeGroup g = getGroup(userId, groupId);
        if (req.getGroupName() != null) g.setGroupName(req.getGroupName());
        if (req.getNoteIds() != null)   g.setNotes(noteRepository.findAllById(req.getNoteIds()));
        return toDetail(groupRepository.save(g));
    }

    @Override
    public void delete(UUID userId, UUID groupId) {
        groupRepository.delete(getGroup(userId, groupId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<KnowledgeGroupResponse.Summary> getAll(UUID userId) {
        return groupRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream().map(this::toSummary).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public KnowledgeGroupResponse.Detail getById(UUID userId, UUID groupId) {
        return toDetail(getGroup(userId, groupId));
    }

    @Override
    public KnowledgeGroupResponse.ClassifyResult classifyNote(UUID userId, KnowledgeGroupRequest.Classify req) {
        return aiService.classifyContent(req.getContent());
    }

    @Override
    public List<KnowledgeGroupResponse.Summary> reclassifyAll(UUID userId) {
        List<Note> notes = noteRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        List<KnowledgeGroup> existingGroups = groupRepository.findByUserIdOrderByCreatedAtDesc(userId);

        for (Note note : notes) {
            if (note.getContent() == null || note.getContent().isBlank()) continue;

            KnowledgeGroupResponse.ClassifyResult result = aiService.classifyContent(
                    "# " + note.getTitle() + "\n\n" + note.getContent());

            String groupName = (result.getSuggestedGroupName() == null
                    || result.getSuggestedGroupName().isBlank())
                    ? "Chung"
                    : result.getSuggestedGroupName();

            final String finalGroupName = groupName;

            KnowledgeGroup group = existingGroups.stream()
                    .filter(g -> g.getGroupName().equalsIgnoreCase(finalGroupName))
                    .findFirst()
                    .orElseGet(() -> {
                        KnowledgeGroup ng = KnowledgeGroup.builder()
                                .user(note.getUser())
                                .groupName(finalGroupName)
                                .suggestedByAi(true)
                                .aiReasoning(result.getReasoning())
                                .notes(new java.util.ArrayList<>())
                                .build();
                        KnowledgeGroup saved = groupRepository.save(ng);
                        existingGroups.add(saved);
                        return saved;
                    });

            if (!group.getNotes().contains(note)) {
                group.getNotes().add(note);
                groupRepository.save(group);
            }
        }

        return getAll(userId);
    }

    // ── Private helpers ───────────────────────────────────────────────────

    private KnowledgeGroup getGroup(UUID userId, UUID groupId) {
        KnowledgeGroup g = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Nhóm không tồn tại"));
        if (!g.getUser().getId().equals(userId))
            throw new ResourceNotFoundException("Nhóm không tồn tại");
        return g;
    }

    private User getUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
    }

    private KnowledgeGroupResponse.Summary toSummary(KnowledgeGroup g) {
        return KnowledgeGroupResponse.Summary.builder()
                .id(g.getId()).groupName(g.getGroupName()).suggestedByAi(g.getSuggestedByAi())
                .noteCount(g.getNotes().size()).createdAt(g.getCreatedAt()).build();
    }

    private KnowledgeGroupResponse.Detail toDetail(KnowledgeGroup g) {
        List<NoteResponse.Summary> notes = g.getNotes().stream()
                .map(noteMapper::toSummary).toList();
        return KnowledgeGroupResponse.Detail.builder()
                .id(g.getId()).groupName(g.getGroupName()).suggestedByAi(g.getSuggestedByAi())
                .aiReasoning(g.getAiReasoning()).notes(notes)
                .createdAt(g.getCreatedAt()).updatedAt(g.getUpdatedAt()).build();
    }
}