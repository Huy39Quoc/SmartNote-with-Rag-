package org.example.velora.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

public class DocumentRequest {

    @Data
    public static class Analyze {
        private String instruction;
    }

    @Data
    public static class Ask {
        @NotBlank(message = "Câu hỏi không được để trống")
        private String question;
    }

    @Data
    public static class TranscribeAudio {

        private String topic;

        private Boolean createNote = false;
        private String noteTitle;
    }
}
