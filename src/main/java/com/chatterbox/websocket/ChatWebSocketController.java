package com.chatterbox.websocket;

import com.chatterbox.dto.MessageRequest;
import com.chatterbox.dto.MessageResponse;
import com.chatterbox.dto.TypingNotification;
import com.chatterbox.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

@Controller
@RequiredArgsConstructor
public class ChatWebSocketController {

    private final SimpMessagingTemplate messagingTemplate;
    private final MessageService messageService;

    @MessageMapping("/chat.send/{roomId}")
    public void sendMessage(@DestinationVariable Long roomId,
                            @Payload MessageRequest request,
                            SimpMessageHeaderAccessor headerAccessor) {
        String username = (String) headerAccessor.getSessionAttributes().get("username");

        if (username != null) {
            MessageResponse response = messageService.sendMessage(roomId, request, username);
            messagingTemplate.convertAndSend("/topic/room/" + roomId, response);
        }
    }

    @MessageMapping("/chat.typing/{roomId}")
    public void typing(@DestinationVariable Long roomId,
                       @Payload TypingNotification notification,
                       SimpMessageHeaderAccessor headerAccessor) {
        String username = (String) headerAccessor.getSessionAttributes().get("username");

        if (username != null) {
            notification.setUsername(username);
            messagingTemplate.convertAndSend("/topic/room/" + roomId + "/typing", notification);
        }
    }

    @MessageMapping("/chat.read/{roomId}")
    public void markAsRead(@DestinationVariable Long roomId,
                           SimpMessageHeaderAccessor headerAccessor) {
        String username = (String) headerAccessor.getSessionAttributes().get("username");

        if (username != null) {
            messageService.markAsRead(roomId, username);
        }
    }
}
