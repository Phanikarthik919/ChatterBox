package com.chatterbox.dto;

import com.chatterbox.model.Message;
import com.chatterbox.model.enums.MessageStatus;
import com.chatterbox.model.enums.MessageType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageResponse {
    private Long id;
    private Long chatRoomId;
    private UserResponse sender;
    private String content;
    private MessageType type;
    private String fileUrl;
    private String fileName;
    private MessageStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime editedAt;
    private List<ReactionInfo> reactions;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReactionInfo {
        private String emoji;
        private long count;
        private List<String> usernames;
    }

    public static MessageResponse fromMessage(Message message) {
        List<ReactionInfo> reactionInfos = null;
        if (message.getReactions() != null && !message.getReactions().isEmpty()) {
            Map<String, List<String>> grouped = message.getReactions().stream()
                    .collect(Collectors.groupingBy(
                            r -> r.getEmoji(),
                            Collectors.mapping(r -> r.getUser().getUsername(), Collectors.toList())
                    ));
            reactionInfos = grouped.entrySet().stream()
                    .map(e -> ReactionInfo.builder()
                            .emoji(e.getKey())
                            .count(e.getValue().size())
                            .usernames(e.getValue())
                            .build())
                    .collect(Collectors.toList());
        }

        return MessageResponse.builder()
                .id(message.getId())
                .chatRoomId(message.getChatRoom().getId())
                .sender(UserResponse.fromUser(message.getSender()))
                .content(message.getContent())
                .type(message.getType())
                .fileUrl(message.getFileUrl())
                .fileName(message.getFileName())
                .status(message.getStatus())
                .createdAt(message.getCreatedAt())
                .editedAt(message.getEditedAt())
                .reactions(reactionInfos)
                .build();
    }
}
