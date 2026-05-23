package org.example.velora.dto.request;

import org.example.velora.entity.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;

public class UserRequest {

    @Data
    public static class UpdateProfile {
        @Size(max = 100, message = "Tên tối đa 100 ký tự")
        private String fullName;

        @Email(message = "Email không hợp lệ")
        private String email;
    }

    @Data
    public static class AdminUpdate {
        @Size(max = 100)
        private String fullName;

        private User.Role role;

        private Boolean isActive;
    }
}
