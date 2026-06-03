package com.chatterbox.service;

import com.chatterbox.dto.ChatRoomRequest;
import com.chatterbox.dto.ChatRoomResponse;
import com.chatterbox.dto.MessageResponse;
import com.chatterbox.exception.BadRequestException;
import com.chatterbox.exception.ResourceNotFoundException;
import com.chatterbox.model.*;
import com.chatterbox.model.enums.ChatRoomType;
import com.chatterbox.model.enums.ParticipantRole;
import com.chatterbox.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatRoomService {

    private final ChatRoomRepository chatRoomRepository;
    private final ChatRoomParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final MessageRepository messageRepository;

    @Transactional
    public ChatRoomResponse createRoom(ChatRoomRequest request, String username) {
        User creator = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ChatRoom room = ChatRoom.builder()
                .name(request.getName())
                .description(request.getDescription())
                .type(request.getType())
                .createdBy(creator)
                .build();

        ChatRoom savedRoom = chatRoomRepository.save(room);

        // Add creator as OWNER
        addParticipant(savedRoom, creator, ParticipantRole.OWNER);

        // Add other participants
        if (request.getParticipantIds() != null) {
            for (Long userId : request.getParticipantIds()) {
                if (!userId.equals(creator.getId())) {
                    User participant = userRepository.findById(userId)
                            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
                    addParticipant(savedRoom, participant, ParticipantRole.MEMBER);
                }
            }
        }

        return buildRoomResponse(savedRoom, creator.getId());
    }

    @Transactional
    public ChatRoomResponse getOrCreateDirectChat(Long otherUserId, String username) {
        User currentUser = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        User otherUser = userRepository.findById(otherUserId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + otherUserId));

        // Check if direct chat already exists
        return chatRoomRepository.findDirectChatBetween(currentUser.getId(), otherUserId, ChatRoomType.DIRECT)
                .map(room -> buildRoomResponse(room, currentUser.getId()))
                .orElseGet(() -> {
                    ChatRoom room = ChatRoom.builder()
                            .name(otherUser.getDisplayName())
                            .type(ChatRoomType.DIRECT)
                            .createdBy(currentUser)
                            .build();

                    ChatRoom saved = chatRoomRepository.save(room);
                    addParticipant(saved, currentUser, ParticipantRole.MEMBER);
                    addParticipant(saved, otherUser, ParticipantRole.MEMBER);

                    return buildRoomResponse(saved, currentUser.getId());
                });
    }

    public List<ChatRoomResponse> getUserRooms(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return chatRoomRepository.findAllByUserId(user.getId()).stream()
                .map(room -> buildRoomResponse(room, user.getId()))
                .collect(Collectors.toList());
    }

    public ChatRoomResponse getRoomById(Long roomId, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat room not found: " + roomId));

        if (!participantRepository.existsByChatRoomIdAndUserId(roomId, user.getId())) {
            throw new BadRequestException("You are not a member of this room");
        }

        return buildRoomResponse(room, user.getId());
    }

    @Transactional
    public ChatRoomResponse joinRoom(Long roomId, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat room not found"));

        if (room.getType() == ChatRoomType.DIRECT) {
            throw new BadRequestException("Cannot join a direct chat");
        }

        if (participantRepository.existsByChatRoomIdAndUserId(roomId, user.getId())) {
            throw new BadRequestException("Already a member of this room");
        }

        addParticipant(room, user, ParticipantRole.MEMBER);
        return buildRoomResponse(room, user.getId());
    }

    @Transactional
    public void leaveRoom(Long roomId, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!participantRepository.existsByChatRoomIdAndUserId(roomId, user.getId())) {
            throw new BadRequestException("Not a member of this room");
        }

        participantRepository.deleteByChatRoomIdAndUserId(roomId, user.getId());
    }

    private void addParticipant(ChatRoom room, User user, ParticipantRole role) {
        ChatRoomParticipant participant = ChatRoomParticipant.builder()
                .chatRoom(room)
                .user(user)
                .role(role)
                .build();
        participantRepository.save(participant);
    }

    private ChatRoomResponse buildRoomResponse(ChatRoom room, Long currentUserId) {
        ChatRoomResponse response = ChatRoomResponse.fromChatRoom(room);

        // Set last message
        Message lastMessage = messageRepository.findTop1ByChatRoomIdOrderByCreatedAtDesc(room.getId());
        if (lastMessage != null) {
            response.setLastMessage(MessageResponse.fromMessage(lastMessage));
        }

        // Set unread count
        long unread = messageRepository.countUnreadMessages(room.getId(), currentUserId);
        response.setUnreadCount(unread);

        // For direct chats, set the name to the other participant's name
        if (room.getType() == ChatRoomType.DIRECT && response.getParticipants() != null) {
            response.getParticipants().stream()
                    .filter(p -> !p.getId().equals(currentUserId))
                    .findFirst()
                    .ifPresent(other -> {
                        response.setName(other.getDisplayName());
                        response.setAvatarUrl(other.getAvatarUrl());
                    });
        }

        return response;
    }
}
