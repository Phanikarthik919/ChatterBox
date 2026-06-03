package com.chatterbox.controller;

import com.chatterbox.dto.ChatRoomRequest;
import com.chatterbox.dto.ChatRoomResponse;
import com.chatterbox.service.ChatRoomService;
import javax.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class ChatRoomController {

    private final ChatRoomService chatRoomService;

    @PostMapping
    public ResponseEntity<ChatRoomResponse> createRoom(
            @Valid @RequestBody ChatRoomRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(chatRoomService.createRoom(request, userDetails.getUsername()));
    }

    @GetMapping
    public ResponseEntity<List<ChatRoomResponse>> getUserRooms(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(chatRoomService.getUserRooms(userDetails.getUsername()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ChatRoomResponse> getRoomById(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(chatRoomService.getRoomById(id, userDetails.getUsername()));
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<ChatRoomResponse> joinRoom(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(chatRoomService.joinRoom(id, userDetails.getUsername()));
    }

    @PostMapping("/{id}/leave")
    public ResponseEntity<Void> leaveRoom(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        chatRoomService.leaveRoom(id, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/direct/{userId}")
    public ResponseEntity<ChatRoomResponse> getOrCreateDirectChat(
            @PathVariable Long userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(chatRoomService.getOrCreateDirectChat(userId, userDetails.getUsername()));
    }
}
