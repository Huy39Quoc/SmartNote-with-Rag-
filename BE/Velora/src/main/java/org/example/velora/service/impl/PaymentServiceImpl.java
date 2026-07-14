package org.example.velora.service.impl;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.velora.dto.response.ApiResponse;
import org.example.velora.entity.PackageService;
import org.example.velora.entity.PackageTransaction;
import org.example.velora.entity.User;
import org.example.velora.exception.BadRequestException;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.repository.PackageServiceRepository;
import org.example.velora.repository.PackageTransactionRepository;
import org.example.velora.repository.UserRepository;
import org.example.velora.service.PaymentService;
import org.example.velora.util.VNPayPaymentUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final PackageServiceRepository packageServiceRepository;
    private final PackageTransactionRepository packageTransactionRepository;
    private final UserRepository userRepository;

    @Value("${vnpay.tmn-code:DEFAULT_TMN}")         private String tmnCode;
    @Value("${vnpay.hash-secret:DEFAULT_SECRET}")   private String hashSecret;
    @Value("${vnpay.api-url:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}") private String apiUrl;
    @Value("${vnpay.return-url:http://localhost:5173/service-packages}") private String returnUrl;
    @Value("${vnpay.callback-url:http://localhost:8080/api/packages/vnpay-callback}") private String callbackUrl;

    // =========================================================
    // PUBLIC API
    // =========================================================

    @Override
    @Transactional
    public ApiResponse<?> checkout(UUID packageId, String billingType, HttpServletRequest request) {
        User user = currentUser();

        PackageService pkg = packageServiceRepository.findById(packageId)
                .orElseThrow(() -> new ResourceNotFoundException("Gói dịch vụ không tồn tại"));

        String normalizedType = normalizeBillingType(billingType);
        BigDecimal price = resolvePrice(pkg, normalizedType);

        // Gói Free / giá 0 → kích hoạt luôn, không qua VNPay
        if (price.compareTo(BigDecimal.ZERO) <= 0) {
            activateFreePackage(user, pkg);
            Map<String, Object> data = Map.of(
                    "activated",    true,
                    "packageName",  pkg.getName(),
                    "message",      "Đã kích hoạt gói " + pkg.getName()
            );
            return ApiResponse.ok(data);
        }

        // Tạo transaction pending
        String txnRef = "VELORA" + System.currentTimeMillis();
        packageTransactionRepository.save(
                PackageTransaction.builder()
                        .txnRef(txnRef)
                        .user(user)
                        .packageService(pkg)
                        .amount(price)
                        .status("PENDING")
                        .billingType(normalizedType)
                        .build()
        );

        // Build VNPay payment URL
        String paymentUrl = buildPaymentUrl(txnRef, price, request);

        Map<String, Object> data = Map.of(
                "paymentUrl",   paymentUrl,
                "txnRef",       txnRef,
                "packageName",  pkg.getName(),
                "billingType",  normalizedType
        );
        return ApiResponse.ok(data);
    }

    @Override
    @Transactional
    public String handleVnpayCallback(Map<String, String> params) {
        String secureHash = params.get("vnp_SecureHash");

        Map<String, String> verifyParams = new HashMap<>(params);
        verifyParams.remove("vnp_SecureHash");
        verifyParams.remove("vnp_SecureHashType");

        String queryUrl        = VNPayPaymentUtil.buildQueryUrl(verifyParams);
        String calculatedHash  = VNPayPaymentUtil.hmacSHA512(hashSecret.trim(), queryUrl);

        if (!calculatedHash.equalsIgnoreCase(secureHash)) {
            log.warn("VNPay callback: chữ ký không hợp lệ");
            return returnUrl + "?status=invalid_signature";
        }

        String txnRef      = params.get("vnp_TxnRef");
        String responseCode = params.get("vnp_ResponseCode");

        Optional<PackageTransaction> txOpt = packageTransactionRepository.findByTxnRef(txnRef);
        if (txOpt.isEmpty()) {
            log.warn("VNPay callback: không tìm thấy transaction txnRef={}", txnRef);
            return returnUrl + "?status=transaction_not_found";
        }

        PackageTransaction tx = txOpt.get();
        tx.setResponseCode(responseCode);
        tx.setBankCode(params.get("vnp_BankCode"));

        if ("PENDING".equals(tx.getStatus())) {
            if ("00".equals(responseCode)) {
                tx.setStatus("SUCCESS");
                tx.setVnpayTranNo(params.get("vnp_TransactionNo"));
                tx.setPayDate(parseVnpDate(params.get("vnp_PayDate")));
                activatePaidPackage(tx);
            } else {
                tx.setStatus("FAILED");
                log.info("VNPay payment failed txnRef={} responseCode={}", txnRef, responseCode);
            }
            packageTransactionRepository.save(tx);
        }

        if ("SUCCESS".equalsIgnoreCase(tx.getStatus())) {
    return returnUrl;
}

return returnUrl + "?status=" + tx.getStatus().toLowerCase();
    }

    // =========================================================
    // PRIVATE HELPERS
    // =========================================================

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin tài khoản"));
    }

    private void activateFreePackage(User user, PackageService pkg) {
        user.setCurrentPackage(pkg);
        user.setPackageExpiryDate(LocalDateTime.now().plusYears(99));
        userRepository.save(user);
    }

    private void activatePaidPackage(PackageTransaction tx) {
        User user        = tx.getUser();
        PackageService pkg = tx.getPackageService();

        user.setCurrentPackage(pkg);

        LocalDateTime now  = LocalDateTime.now();
        LocalDateTime base = (user.getPackageExpiryDate() != null && user.getPackageExpiryDate().isAfter(now))
                ? user.getPackageExpiryDate()
                : now;

        BigDecimal yearlyPrice = pkg.getPriceYearly() == null
                ? null
                : BigDecimal.valueOf(pkg.getPriceYearly());

        boolean isYearly = "yearly".equalsIgnoreCase(tx.getBillingType())
                || (tx.getBillingType() == null && yearlyPrice != null && tx.getAmount().compareTo(yearlyPrice) == 0);
        user.setPackageExpiryDate(isYearly ? base.plusYears(1) : base.plusMonths(1));

        userRepository.save(user);
    }

    private LocalDateTime parseVnpDate(String value) {
        if (value == null || value.isBlank()) return null;
        try { return LocalDateTime.parse(value, DateTimeFormatter.ofPattern("yyyyMMddHHmmss")); }
        catch (Exception ignored) { return null; }
    }

    private BigDecimal resolvePrice(PackageService pkg, String billingType) {
        if ("yearly".equals(billingType)) {
            if (pkg.getPriceYearly() == null)
                throw new BadRequestException("Gói dịch vụ này không hỗ trợ thanh toán theo năm");
            return BigDecimal.valueOf(pkg.getPriceYearly());
        }
        if (pkg.getPriceMonthly() == null)
            throw new BadRequestException("Gói dịch vụ này không hỗ trợ thanh toán theo tháng");
        return BigDecimal.valueOf(pkg.getPriceMonthly());
    }

    private String normalizeBillingType(String type) {
        return "yearly".equalsIgnoreCase(type) ? "yearly" : "monthly";
    }

    private String buildPaymentUrl(String txnRef, BigDecimal price, HttpServletRequest request) {
        long vnpAmount = price.multiply(BigDecimal.valueOf(100)).longValue();

        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_Version",   "2.1.0");
        vnpParams.put("vnp_Command",   "pay");
        vnpParams.put("vnp_TmnCode",   tmnCode.trim());
        vnpParams.put("vnp_Amount",    String.valueOf(vnpAmount));
        vnpParams.put("vnp_CurrCode",  "VND");
        vnpParams.put("vnp_TxnRef",    txnRef);
        vnpParams.put("vnp_OrderInfo", "ThanhToanGoi" + txnRef);
        vnpParams.put("vnp_OrderType", "other");
        vnpParams.put("vnp_Locale",    "vn");
        vnpParams.put("vnp_ReturnUrl", callbackUrl.trim());
        vnpParams.put("vnp_IpAddr",    resolveIp(request));

        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
        vnpParams.put("vnp_CreateDate", now.format(fmt));
        vnpParams.put("vnp_ExpireDate", now.plusMinutes(15).format(fmt));

        List<String> fieldNames = new ArrayList<>(vnpParams.keySet());
        Collections.sort(fieldNames);

        StringBuilder hashData = new StringBuilder();
        StringBuilder query    = new StringBuilder();
        Iterator<String> itr   = fieldNames.iterator();

        while (itr.hasNext()) {
            String k = itr.next();
            String v = vnpParams.get(k);
            if (v != null && !v.isBlank()) {
                try {
                    String encodedKey = URLEncoder.encode(k, StandardCharsets.US_ASCII);
                    String encodedVal = URLEncoder.encode(v, StandardCharsets.US_ASCII);

                    hashData.append(k).append('=').append(encodedVal);
                    query.append(encodedKey).append('=').append(encodedVal);
                } catch (Exception e) {
                    throw new RuntimeException("Lỗi mã hóa URL", e);
                }
                if (itr.hasNext()) {
                    hashData.append('&');
                    query.append('&');
                }
            }
        }

        String secureHash = VNPayPaymentUtil.hmacSHA512(hashSecret.trim(), hashData.toString());
        return apiUrl + "?" + query + "&vnp_SecureHash=" + secureHash;
    }

    private String resolveIp(HttpServletRequest request) {
        String ip = VNPayPaymentUtil.getIpAddress(request);
        if (ip == null || ip.contains(":") || ip.contains(",")) return "127.0.0.1";
        return ip;
    }
}
