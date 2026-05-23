package org.example.velora.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

public class TagRequest {

    @Data
    public static class Create {
        @NotBlank(message = "Tên tag không được để trống")
        @Size(max = 50, message = "Tên tag tối đa 50 ký tự")
        private String name;

        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Màu phải là mã hex hợp lệ, ví dụ: #FF5733")
        private String color;
    }

    @Data
    public static class Update {
        @Size(max = 50, message = "Tên tag tối đa 50 ký tự")
        private String name;

        @Pattern(regexp = "^#[0-9A-Fa-f]{6}$", message = "Màu phải là mã hex hợp lệ, ví dụ: #FF5733")
        private String color;
    }
}
