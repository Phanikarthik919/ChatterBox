package com.chatterbox.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TypingNotification {
    private Long roomId;
    private Long userId;
    private String username;
    private boolean typing;
}
