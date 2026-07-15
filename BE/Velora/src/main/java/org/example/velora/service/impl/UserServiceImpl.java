package org.example.velora.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.velora.dto.request.UserRequest;
import org.example.velora.dto.response.UserResponse;
import org.example.velora.entity.User;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.mapper.UserMapper;
import org.example.velora.repository.DocumentRepository;
import org.example.velora.repository.NoteRepository;
import org.example.velora.repository.UserRepository;
import org.example.velora.service.UserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final NoteRepository noteRepository;
    private final DocumentRepository documentRepository;
    private final UserMapper userMapper;

    @Override
    @Transactional(readOnly = true)
    public UserResponse.Profile getProfile(UUID userId) {
        User user = getUser(userId);
        return userMapper.toProfile(user,
                noteRepository.countByUserId(userId),
                documentRepository.sumFileSizeByUserId(userId));
    }

    @Override
    public UserResponse.Profile updateProfile(UUID userId, UserRequest.UpdateProfile req) {
        User user = getUser(userId);

        if (req.getFullName() != null)
            user.setFullName(req.getFullName().trim());

        User saved = userRepository.save(user);
        return userMapper.toProfile(saved,
                noteRepository.countByUserId(userId),
                documentRepository.sumFileSizeByUserId(userId));
    }

    private User getUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User không tồn tại"));
    }
}
