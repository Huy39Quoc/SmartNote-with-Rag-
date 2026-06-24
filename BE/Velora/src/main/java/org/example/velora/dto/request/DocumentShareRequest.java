package org.example.velora.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.example.velora.entity.DocumentShare;

public class DocumentShareRequest {

    @Data
    public static class Share {

        @NotBlank(message = "Email người nhận không được để trống")
        @Email(message = "Email không hợp lệ")
        private String email;

        @NotNull(message = "Quyền chia sẻ không được để trống")
        private DocumentShare.Permission permission;
    }
}