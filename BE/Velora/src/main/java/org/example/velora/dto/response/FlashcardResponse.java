package org.example.velora.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FlashcardResponse {
    private String id;
    private String question;
    private String answer;
    private String noteId;
    private LocalDateTime createdAt;
}
