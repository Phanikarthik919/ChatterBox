package com.chatterbox.websocket;

import com.chatterbox.dto.PresenceNotification;
import com.chatterbox.model.enums.UserStatus;
import com.chatterbox.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventListener {

    private final SimpMessagingTemplate messagingTemplate;
    private final UserService userService;

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String username = headerAccessor.getFirstNativeHeader("username");

        if (username != null) {
            headerAccessor.getSessionAttributes().put("username", username);
            log.info("User connected: {}", username);

            try {
                userService.updateUserStatus(username, UserStatus.ONLINE);

                PresenceNotification notification = PresenceNotification.builder()
                        .username(username)
                        .status(UserStatus.ONLINE)
                        .build();
                messagingTemplate.convertAndSend("/topic/presence", notification);
            } catch (Exception e) {
                log.error("Error updating user status on connect: {}", e.getMessage());
            }
        }
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String username = (String) headerAccessor.getSessionAttributes().get("username");

        if (username != null) {
            log.info("User disconnected: {}", username);

            try {
                userService.updateUserStatus(username, UserStatus.OFFLINE);

                PresenceNotification notification = PresenceNotification.builder()
                        .username(username)
                        .status(UserStatus.OFFLINE)
                        .build();
                messagingTemplate.convertAndSend("/topic/presence", notification);
            } catch (Exception e) {
                log.error("Error updating user status on disconnect: {}", e.getMessage());
            }
        }
    }
}
