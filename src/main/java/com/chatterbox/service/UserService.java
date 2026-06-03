package com.chatterbox.service;

import com.chatterbox.dto.UserResponse;
import com.chatterbox.exception.ResourceNotFoundException;
import com.chatterbox.model.User;
import com.chatterbox.model.enums.UserStatus;
import com.chatterbox.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }

    public UserResponse getUserResponseById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return UserResponse.fromUser(user);
    }

    public UserResponse getProfile(String username) {
        User user = getUserByUsername(username);
        return UserResponse.fromUser(user);
    }

    @Transactional
    public UserResponse updateProfile(String username, String displayName, String bio, String avatarUrl) {
        User user = getUserByUsername(username);
        if (displayName != null) user.setDisplayName(displayName);
        if (bio != null) user.setBio(bio);
        if (avatarUrl != null) user.setAvatarUrl(avatarUrl);
        return UserResponse.fromUser(userRepository.save(user));
    }

    public List<UserResponse> searchUsers(String query) {
        return userRepository.findByUsernameContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(query, query)
                .stream()
                .map(UserResponse::fromUser)
                .collect(Collectors.toList());
    }

    public List<UserResponse> getOnlineUsers() {
        return userRepository.findByStatus(UserStatus.ONLINE)
                .stream()
                .map(UserResponse::fromUser)
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateUserStatus(String username, UserStatus status) {
        User user = getUserByUsername(username);
        user.setStatus(status);
        user.setLastSeen(LocalDateTime.now());
        userRepository.save(user);
    }
}
