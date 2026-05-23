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
        /** Tuỳ chọn: gợi ý chủ đề để AI nhận dạng tốt hơn */
        private String topic;
        /** Có tạo ghi chú từ transcript không? */
        private Boolean createNote = false;
        private String noteTitle;
    }
}
