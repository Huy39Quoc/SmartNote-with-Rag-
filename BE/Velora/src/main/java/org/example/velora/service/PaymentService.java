package org.example.velora.service;

import jakarta.servlet.http.HttpServletRequest;
import org.example.velora.dto.response.ApiResponse;

import java.util.*;

public interface PaymentService {

    /**
     * Tạo VNPay payment URL hoặc kích hoạt trực tiếp nếu gói Free.
     */
    ApiResponse<?> checkout(UUID packageId, String billingType, HttpServletRequest request);

    /**
     * Xử lý callback từ VNPay sau khi thanh toán.
     * Trả về URL redirect về frontend.
     */
    String handleVnpayCallback(Map<String, String> params);
}