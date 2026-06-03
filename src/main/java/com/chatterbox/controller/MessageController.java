package com.chatterbox.controller;

import com.chatterbox.dto.MessageRequest;
import com.chatterbox.dto.MessageResponse;
import com.chatterbox.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @PostMapping("/api/rooms/{roomId}/messages")
    public ResponseEntity<MessageResponse> sendMessage(
            @PathVariable Long roomId,
            @RequestBody MessageRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(messageService.sendMessage(roomId, request, userDetails.getUsername()));
    }

    @GetMapping("/api/rooms/{roomId}/messages")
    public ResponseEntity<List<MessageResponse>> getMessages(
            @PathVariable Long roomId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(messageService.getMessages(roomId, page, size, userDetails.getUsername()));
    }

    @PutMapping("/api/messages/{id}")
    public ResponseEntity<MessageResponse> editMessage(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(messageService.editMessage(id, body.get("content"), userDetails.getUsername()));
    }

    @DeleteMapping("/api/messages/{id}")
    public ResponseEntity<Void> deleteMessage(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        messageService.deleteMessage(id, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/api/messages/{id}/reactions")
    public ResponseEntity<MessageResponse> addReaction(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(messageService.addReaction(id, body.get("emoji"), userDetails.getUsername()));
    }

    @DeleteMapping("/api/messages/{id}/reactions/{emoji}")
    public ResponseEntity<Void> removeReaction(
            @PathVariable Long id,
            @PathVariable String emoji,
            @AuthenticationPrincipal UserDetails userDetails) {
        messageService.removeReaction(id, emoji, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }
}
