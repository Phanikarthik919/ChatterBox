package com.chatterbox.dto;

import com.chatterbox.model.enums.UserStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PresenceNotification {
    private Long userId;
    private String username;
    private UserStatus status;
}
