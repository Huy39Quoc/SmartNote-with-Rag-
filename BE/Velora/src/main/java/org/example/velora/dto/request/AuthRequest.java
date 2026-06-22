package org.example.velora.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

public class AuthRequest {

    @Data
    public static class Register {
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        private String email;

        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(min = 6, max = 100, message = "Mật khẩu từ 6–100 ký tự")
        private String password;

        @NotBlank(message = "Họ và tên không được để trống")
        @Size(max = 100, message = "Tên tối đa 100 ký tự")
        private String fullName;
    }

    @Data
    public static class Login {
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        private String email;

        @NotBlank(message = "Mật khẩu không được để trống")
        private String password;
    }

    @Data
    public static class RefreshToken {
        @NotBlank(message = "Refresh token không được để trống")
        private String refreshToken;
    }

    @Data
    public static class ChangePassword {
        @NotBlank(message = "Mật khẩu cũ không được để trống")
        private String oldPassword;

        @NotBlank(message = "Mật khẩu mới không được để trống")
        @Size(min = 6, max = 100, message = "Mật khẩu từ 6–100 ký tự")
        private String newPassword;
    }
}
