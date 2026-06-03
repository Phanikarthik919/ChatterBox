package com.chatterbox.service;

import com.chatterbox.dto.MessageRequest;
import com.chatterbox.dto.MessageResponse;
import com.chatterbox.exception.BadRequestException;
import com.chatterbox.exception.ResourceNotFoundException;
import com.chatterbox.model.*;
import com.chatterbox.model.enums.MessageStatus;
import com.chatterbox.model.enums.MessageType;
import com.chatterbox.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final ChatRoomParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final MessageReactionRepository reactionRepository;

    @Transactional
    public MessageResponse sendMessage(Long roomId, MessageRequest request, String username) {
        User sender = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Chat room not found"));

        if (!participantRepository.existsByChatRoomIdAndUserId(roomId, sender.getId())) {
            throw new BadRequestException("You are not a member of this room");
        }

        Message message = Message.builder()
                .chatRoom(room)
                .sender(sender)
                .content(request.getContent())
                .type(request.getType() != null ? request.getType() : MessageType.TEXT)
                .fileUrl(request.getFileUrl())
                .fileName(request.getFileName())
                .status(MessageStatus.SENT)
                .build();

        Message saved = messageRepository.save(message);
        return MessageResponse.fromMessage(saved);
    }

    public List<MessageResponse> getMessages(Long roomId, int page, int size, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (!participantRepository.existsByChatRoomIdAndUserId(roomId, user.getId())) {
            throw new BadRequestException("You are not a member of this room");
        }

        Pageable pageable = PageRequest.of(page, size);
        Page<Message> messages = messageRepository.findByChatRoomIdOrderByCreatedAtDesc(roomId, pageable);

        return messages.getContent().stream()
                .map(MessageResponse::fromMessage)
                .collect(Collectors.toList());
    }

    @Transactional
    public MessageResponse editMessage(Long messageId, String content, String username) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

        if (!message.getSender().getUsername().equals(username)) {
            throw new BadRequestException("You can only edit your own messages");
        }

        message.setContent(content);
        message.setEditedAt(LocalDateTime.now());
        return MessageResponse.fromMessage(messageRepository.save(message));
    }

    @Transactional
    public void deleteMessage(Long messageId, String username) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

        if (!message.getSender().getUsername().equals(username)) {
            throw new BadRequestException("You can only delete your own messages");
        }

        messageRepository.delete(message);
    }

    @Transactional
    public void markAsRead(Long roomId, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        messageRepository.markMessagesAsRead(roomId, user.getId(), MessageStatus.READ);
    }

    @Transactional
    public MessageResponse addReaction(Long messageId, String emoji, String username) {
        Message message = messageRepository.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found"));

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Check if reaction already exists
        if (reactionRepository.findByMessageIdAndUserIdAndEmoji(messageId, user.getId(), emoji).isPresent()) {
            throw new BadRequestException("Reaction already exists");
        }

        MessageReaction reaction = MessageReaction.builder()
                .message(message)
                .user(user)
                .emoji(emoji)
                .build();

        reactionRepository.save(reaction);

        // Reload message with reactions
        message = messageRepository.findById(messageId).orElseThrow();
        return MessageResponse.fromMessage(message);
    }

    @Transactional
    public void removeReaction(Long messageId, String emoji, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        reactionRepository.deleteByMessageIdAndUserIdAndEmoji(messageId, user.getId(), emoji);
    }
}
