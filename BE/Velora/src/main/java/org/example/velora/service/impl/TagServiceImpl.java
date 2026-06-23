package org.example.velora.service.impl;

import org.example.velora.dto.PackageValidationDto;
import org.example.velora.dto.request.TagRequest;
import org.example.velora.dto.response.TagResponse;
import org.example.velora.entity.Tag;
import org.example.velora.entity.User;
import org.example.velora.exception.BadRequestException;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.repository.TagRepository;
import org.example.velora.repository.UserRepository;
import org.example.velora.service.TagService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service @RequiredArgsConstructor @Transactional
public class TagServiceImpl implements TagService {

    private final TagRepository tagRepository;
    private final UserRepository userRepository;

    @Override
    public TagResponse.Detail create(UUID userId, TagRequest.Create req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));

        PackageValidationDto.validateFeatureAccess(user, "TAG_SUBJECT");

        String name = req.getName().trim();
        String color = req.getColor() == null || req.getColor().isBlank()
                ? "#3B82F6"
                : req.getColor();

        if (tagRepository.existsByUserIdAndName(userId, name)) {
            throw new BadRequestException("Tag '" + name + "' đã tồn tại");
        }

        Tag tag = Tag.builder()
                .user(user)
                .name(name)
                .color(color)
                .build();

        return toDetail(tagRepository.save(tag));
    }

    @Override
    public TagResponse.Detail update(UUID userId, UUID tagId, TagRequest.Update req) {
        Tag tag = getTag(userId, tagId);
        if (req.getName() != null) tag.setName(req.getName());
        if (req.getColor() != null) tag.setColor(req.getColor());
        return toDetail(tagRepository.save(tag));
    }

    @Override
    public void delete(UUID userId, UUID tagId) {
        tagRepository.delete(getTag(userId, tagId));
    }

    @Override @Transactional(readOnly = true)
    public List<TagResponse.Detail> getAll(UUID userId) {
        return tagRepository.findByUserIdOrderByNameAsc(userId).stream().map(this::toDetail).toList();
    }

    private Tag getTag(UUID userId, UUID tagId) {
        Tag tag = tagRepository.findById(tagId)
            .orElseThrow(() -> new ResourceNotFoundException("Tag không tồn tại"));
        if (!tag.getUser().getId().equals(userId))
            throw new ResourceNotFoundException("Tag không tồn tại");
        return tag;
    }

    private TagResponse.Detail toDetail(Tag t) {
        return TagResponse.Detail.builder()
            .id(t.getId()).name(t.getName()).color(t.getColor())
            .noteCount(t.getNotes().size()).createdAt(t.getCreatedAt()).build();
    }
}
