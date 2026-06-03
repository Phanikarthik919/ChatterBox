package com.chatterbox.dto;

import com.chatterbox.model.enums.MessageType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MessageRequest {
    private String content;
    private MessageType type;
    private String fileUrl;
    private String fileName;
}
