package com.chatterbox.dto;

import com.chatterbox.model.ChatRoom;
import com.chatterbox.model.enums.ChatRoomType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRoomResponse {
    private Long id;
    private String name;
    private String description;
    private ChatRoomType type;
    private String avatarUrl;
    private UserResponse createdBy;
    private List<UserResponse> participants;
    private MessageResponse lastMessage;
    private long unreadCount;
    private LocalDateTime createdAt;

    public static ChatRoomResponse fromChatRoom(ChatRoom room) {
        return ChatRoomResponse.builder()
                .id(room.getId())
                .name(room.getName())
                .description(room.getDescription())
                .type(room.getType())
                .avatarUrl(room.getAvatarUrl())
                .createdBy(room.getCreatedBy() != null ? UserResponse.fromUser(room.getCreatedBy()) : null)
                .participants(room.getParticipants().stream()
                        .map(p -> UserResponse.fromUser(p.getUser()))
                        .collect(Collectors.toList()))
                .createdAt(room.getCreatedAt())
                .build();
    }
}
