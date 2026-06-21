package org.example.velora.dto.request;

import org.example.velora.entity.Schedule;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import jakarta.validation.constraints.FutureOrPresent;
import java.time.LocalDate;
import java.util.UUID;

public class ScheduleRequest {

    @Data
    public static class Create {
        @NotBlank(message = "Tên task không được để trống")
        @Size(max = 255, message = "Tên task tối đa 255 ký tự")
        private String taskName;

        private String description;

        @FutureOrPresent(message = "Deadline không được nằm trong quá khứ")
        private LocalDate deadline;

        private Schedule.Priority priority = Schedule.Priority.MEDIUM;

        private UUID noteId;
    }

    @Data
    public static class Update {
        @Size(max = 255, message = "Tên task tối đa 255 ký tự")
        private String taskName;

        private String description;

        @FutureOrPresent(message = "Deadline không được nằm trong quá khứ")
        private LocalDate deadline;

        private Schedule.Priority priority;

        private Boolean isDone;
    }

    @Data
    public static class ExtractFromNote {
        @NotBlank(message = "Nội dung ghi chú không được để trống")
        private String content;

        private UUID noteId;
    }
}
