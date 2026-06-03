package com.chatterbox.dto;

import com.chatterbox.model.enums.ChatRoomType;
import javax.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatRoomRequest {

    private String name;
    private String description;

    @NotNull(message = "Room type is required")
    private ChatRoomType type;

    private List<Long> participantIds;
}
