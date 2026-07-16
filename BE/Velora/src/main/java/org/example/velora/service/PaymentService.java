package org.example.velora.service;

import jakarta.servlet.http.HttpServletRequest;
import org.example.velora.dto.response.ApiResponse;

import java.util.*;

public interface PaymentService {

    ApiResponse<?> checkout(UUID packageId, String billingType, HttpServletRequest request);

    String handleVnpayCallback(Map<String, String> params);
}
