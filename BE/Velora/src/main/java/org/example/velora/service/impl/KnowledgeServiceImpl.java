package org.example.velora.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.velora.dto.request.KnowledgeGroupRequest;
import org.example.velora.dto.response.KnowledgeGroupResponse;
import org.example.velora.dto.response.NoteResponse;
import org.example.velora.entity.AiClassificationFeedback;
import org.example.velora.entity.KnowledgeGroup;
import org.example.velora.entity.Note;
import org.example.velora.entity.User;
import org.example.velora.exception.BadRequestException;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.mapper.NoteMapper;
import org.example.velora.repository.AiClassificationFeedbackRepository;
import org.example.velora.repository.KnowledgeGroupRepository;
import org.example.velora.repository.NoteRepository;
import org.example.velora.repository.UserRepository;
import org.example.velora.service.AiService;
import org.example.velora.service.KnowledgeService;
import org.example.velora.service.UserPackageService;
import org.example.velora.util.RichTextContent;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class KnowledgeServiceImpl implements KnowledgeService {

    private static final String FEATURE_GROUP_MANAGEMENT = "AI_ANALYZE";

    private final KnowledgeGroupRepository groupRepository;
    private final NoteRepository noteRepository;
    private final UserRepository userRepository;
    private final AiService aiService;
    private final NoteMapper noteMapper;
    private final UserPackageService userPackageService;
    private final AiClassificationFeedbackRepository feedbackRepository;

    @Override
    public KnowledgeGroupResponse.Detail create(UUID userId, KnowledgeGroupRequest.Create req) {
        User user = getUser(userId);

        userPackageService.checkFeatureAccess(user, FEATURE_GROUP_MANAGEMENT);

        List<Note> notes = req.getNoteIds() != null
                ? noteRepository.findAllById(req.getNoteIds())
                : List.of();

        KnowledgeGroup group = KnowledgeGroup.builder()
                .user(user)
                .groupName(req.getGroupName())
                .notes(notes)
                .build();

        return toDetail(groupRepository.save(group));
    }

    @Override
    public KnowledgeGroupResponse.Detail update(UUID userId, UUID groupId, KnowledgeGroupRequest.Update req) {
        KnowledgeGroup group = getGroup(userId, groupId);

        if (req.getGroupName() != null) {
            group.setGroupName(req.getGroupName());
        }

        if (req.getNoteIds() != null) {
            group.setNotes(noteRepository.findAllById(req.getNoteIds()));
        }

        return toDetail(groupRepository.save(group));
    }

    @Override
    public void delete(UUID userId, UUID groupId) {
        groupRepository.delete(getGroup(userId, groupId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<KnowledgeGroupResponse.Summary> getAll(UUID userId) {
        return groupRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(this::toSummary)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public KnowledgeGroupResponse.Detail getById(UUID userId, UUID groupId) {
        return toDetail(getGroup(userId, groupId));
    }

    @Override
    public KnowledgeGroupResponse.ClassifyResult classifyNote(UUID userId, KnowledgeGroupRequest.Classify req) {
        User user = getUser(userId);
        userPackageService.checkFeatureAccess(user, FEATURE_GROUP_MANAGEMENT);

        return aiService.classifyContent(RichTextContent.toPlainText(req.getContent()));
    }

    @Override
    public List<KnowledgeGroupResponse.Summary> reclassifyAll(UUID userId) {
        User user = getUser(userId);
        userPackageService.checkFeatureAccess(user, FEATURE_GROUP_MANAGEMENT);

        List<Note> notes = noteRepository.findByUserIdOrderByUpdatedAtDesc(userId);
        List<KnowledgeGroup> existingGroups = groupRepository.findByUserIdOrderByCreatedAtDesc(userId);

        for (Note note : notes) {
            String plainContent = RichTextContent.toPlainText(note.getContent());

            if (!StringUtils.hasText(plainContent)) {
                continue;
            }

            KnowledgeGroupResponse.ClassifyResult result = aiService.classifyContent(
                    "# " + note.getTitle() + "\n\n" + plainContent
            );

            String groupName = normalizeGroupName(result.getSuggestedGroupName(), "Chung");
            final String finalGroupName = groupName;

            KnowledgeGroup group = existingGroups.stream()
                    .filter(g -> g.getGroupName() != null
                            && g.getGroupName().equalsIgnoreCase(finalGroupName))
                    .findFirst()
                    .orElseGet(() -> {
                        KnowledgeGroup created = KnowledgeGroup.builder()
                                .user(note.getUser())
                                .groupName(finalGroupName)
                                .suggestedByAi(true)
                                .aiReasoning(result.getReasoning())
                                .notes(new java.util.ArrayList<>())
                                .build();

                        KnowledgeGroup saved = groupRepository.save(created);
                        existingGroups.add(saved);
                        return saved;
                    });

            boolean alreadyExists = group.getNotes()
                    .stream()
                    .anyMatch(n -> n.getId().equals(note.getId()));

            if (!alreadyExists) {
                group.getNotes().add(note);
                groupRepository.save(group);
            }
        }

        return getAll(userId);
    }

    @Override
    public KnowledgeGroupResponse.FeedbackResult submitClassificationFeedback(
            UUID userId,
            KnowledgeGroupRequest.ClassificationFeedback req
    ) {
        User user = getUser(userId);

        String suggestedGroupName = normalizeGroupName(req.getSuggestedGroupName(), "Chung");
        String correctedGroupName = normalizeGroupName(req.getCorrectedGroupName(), suggestedGroupName);
        boolean isCorrect = Boolean.TRUE.equals(req.getCorrect());

        if (!isCorrect && !StringUtils.hasText(req.getCorrectedGroupName())) {
            throw new BadRequestException("Vui lòng nhập nhóm đúng khi đánh giá AI phân loại sai.");
        }

        Note note = null;
        if (req.getNoteId() != null) {
            note = noteRepository.findById(req.getNoteId())
                    .orElseThrow(() -> new ResourceNotFoundException("Ghi chú không tồn tại"));

            if (note.getUser() == null || !note.getUser().getId().equals(userId)) {
                throw new ResourceNotFoundException("Ghi chú không tồn tại");
            }
        }

        KnowledgeGroup group = null;
        if (req.getGroupId() != null) {
            group = getGroup(userId, req.getGroupId());
        }

        AiClassificationFeedback saved = feedbackRepository.save(
                AiClassificationFeedback.builder()
                        .user(user)
                        .note(note)
                        .group(group)
                        .suggestedGroupName(suggestedGroupName)
                        .correctedGroupName(correctedGroupName)
                        .correct(isCorrect)
                        .aiReasoning(req.getAiReasoning())
                        .comment(req.getComment())
                        .build()
        );

        if (!isCorrect && note != null) {
            moveNoteToCorrectedGroup(user, note, group, correctedGroupName, req.getAiReasoning());
        }

        String message = isCorrect
                ? "Đã ghi nhận AI phân loại đúng."
                : "Đã ghi nhận AI phân loại sai và chuyển ghi chú sang nhóm đúng.";

        return KnowledgeGroupResponse.FeedbackResult.builder()
                .id(saved.getId())
                .noteId(note != null ? note.getId() : null)
                .groupId(group != null ? group.getId() : null)
                .suggestedGroupName(saved.getSuggestedGroupName())
                .correctedGroupName(saved.getCorrectedGroupName())
                .correct(saved.getCorrect())
                .message(message)
                .createdAt(saved.getCreatedAt())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public KnowledgeGroupResponse.FeedbackStats getClassificationFeedbackStats(UUID userId) {
        long total = feedbackRepository.countByUserId(userId);
        long correct = feedbackRepository.countByUserIdAndCorrect(userId, true);
        long incorrect = feedbackRepository.countByUserIdAndCorrect(userId, false);

        double accuracyPercent = total == 0
                ? 0
                : Math.round((correct * 10000.0) / total) / 100.0;

        return KnowledgeGroupResponse.FeedbackStats.builder()
                .total(total)
                .correct(correct)
                .incorrect(incorrect)
                .accuracyPercent(accuracyPercent)
                .build();
    }

    private void moveNoteToCorrectedGroup(
            User user,
            Note note,
            KnowledgeGroup currentGroup,
            String correctedGroupName,
            String aiReasoning
    ) {
        if (currentGroup != null
                && currentGroup.getGroupName() != null
                && currentGroup.getGroupName().equalsIgnoreCase(correctedGroupName)) {
            return;
        }

        if (currentGroup != null) {
            boolean removed = currentGroup.getNotes().removeIf(n -> n.getId().equals(note.getId()));

            if (removed) {
                groupRepository.save(currentGroup);
            }
        }

        List<KnowledgeGroup> groups = groupRepository.findByUserIdOrderByCreatedAtDesc(user.getId());

        KnowledgeGroup targetGroup = groups.stream()
                .filter(g -> g.getGroupName() != null
                        && g.getGroupName().equalsIgnoreCase(correctedGroupName))
                .findFirst()
                .orElseGet(() -> {
                    KnowledgeGroup created = KnowledgeGroup.builder()
                            .user(user)
                            .groupName(correctedGroupName)
                            .suggestedByAi(false)
                            .aiReasoning("Nhóm được tạo từ feedback sửa phân loại AI.")
                            .notes(new java.util.ArrayList<>())
                            .build();

                    return groupRepository.save(created);
                });

        boolean alreadyExists = targetGroup.getNotes()
                .stream()
                .anyMatch(n -> n.getId().equals(note.getId()));

        if (!alreadyExists) {
            targetGroup.getNotes().add(note);

            if (!StringUtils.hasText(targetGroup.getAiReasoning())) {
                targetGroup.setAiReasoning(aiReasoning);
            }

            groupRepository.save(targetGroup);
        }
    }

    private String normalizeGroupName(String value, String fallback) {
        String result = value == null ? "" : value.trim();

        if (!StringUtils.hasText(result)) {
            result = fallback;
        }

        if (result.length() > 100) {
            result = result.substring(0, 100).trim();
        }

        return result;
    }

    private KnowledgeGroup getGroup(UUID userId, UUID groupId) {
        KnowledgeGroup group = groupRepository.findById(groupId)
                .orElseThrow(() -> new ResourceNotFoundException("Nhóm không tồn tại"));

        if (group.getUser() == null || !group.getUser().getId().equals(userId)) {
            throw new ResourceNotFoundException("Nhóm không tồn tại");
        }

        return group;
    }

    private User getUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
    }

    private KnowledgeGroupResponse.Summary toSummary(KnowledgeGroup group) {
        return KnowledgeGroupResponse.Summary.builder()
                .id(group.getId())
                .groupName(group.getGroupName())
                .suggestedByAi(group.getSuggestedByAi())
                .noteCount(group.getNotes().size())
                .createdAt(group.getCreatedAt())
                .build();
    }

    private KnowledgeGroupResponse.Detail toDetail(KnowledgeGroup group) {
        List<NoteResponse.Summary> notes = group.getNotes()
                .stream()
                .map(noteMapper::toSummary)
                .toList();

        return KnowledgeGroupResponse.Detail.builder()
                .id(group.getId())
                .groupName(group.getGroupName())
                .suggestedByAi(group.getSuggestedByAi())
                .aiReasoning(group.getAiReasoning())
                .notes(notes)
                .createdAt(group.getCreatedAt())
                .updatedAt(group.getUpdatedAt())
                .build();
    }
}