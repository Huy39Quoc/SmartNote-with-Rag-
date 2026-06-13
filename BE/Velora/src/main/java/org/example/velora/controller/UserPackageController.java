package org.example.velora.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.example.velora.entity.PackageService;
import org.example.velora.entity.PackageTransaction;
import org.example.velora.entity.User;
import org.example.velora.repository.PackageServiceRepository;
import org.example.velora.repository.PackageTransactionRepository;
import org.example.velora.repository.UserRepository;
import org.example.velora.util.VNPayPaymentUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@RestController
@RequiredArgsConstructor
public class UserPackageController {

    private final PackageServiceRepository packageServiceRepository;
    private final PackageTransactionRepository packageTransactionRepository;
    private final UserRepository userRepository;

    @Value("${vnpay.tmn-code:DEFAULT_TMN}")
    private String tmnCode;

    @Value("${vnpay.hash-secret:DEFAULT_SECRET}")
    private String hashSecret;

    @Value("${vnpay.api-url:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}")
    private String apiUrl;

    @Value("${vnpay.return-url:http://localhost:5173/tong-quan}")
    private String returnUrl;

    @Value("${vnpay.callback-url:http://localhost:8080/api/packages/vnpay-callback}")
    private String callbackUrl;

    @GetMapping("/api/packages/active")
    public ResponseEntity<?> getActivePackages() {
        // Thay thế bằng Map.of để khớp với data.data của Frontend mà không cần dùng ApiResponse
        return ResponseEntity.ok(Map.of("data", packageServiceRepository.findByIsActiveTrue()));
    }

    @PostMapping("/api/packages/buy/{packageId}")
    public ResponseEntity<?> checkoutPackage(
            @PathVariable UUID packageId,
            @RequestParam(defaultValue = "monthly") String type, // Thêm param để phân biệt mua theo tháng/năm
            HttpServletRequest request) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("Không tìm thấy thông tin tài khoản"));

        PackageService pkg = packageServiceRepository.findById(packageId)
                .orElseThrow(() -> new RuntimeException("Gói dịch vụ không tồn tại"));

        // 1. Xác định giá tiền dựa trên loại hình thanh toán (monthly hoặc yearly)
        java.math.BigDecimal price;
        if ("yearly".equalsIgnoreCase(type)) {
            if (pkg.getPriceYearly() == null) {
                throw new RuntimeException("Gói dịch vụ này không hỗ trợ thanh toán theo năm");
            }
            price = java.math.BigDecimal.valueOf(pkg.getPriceYearly());
        } else {
            if (pkg.getPriceMonthly() == null) {
                throw new RuntimeException("Gói dịch vụ này không hỗ trợ thanh toán theo tháng");
            }
            price = java.math.BigDecimal.valueOf(pkg.getPriceMonthly());
        }

        // 1. Dọn dẹp txnRef và OrderInfo (Tuyệt đối KHÔNG chứa khoảng trắng, tiếng Việt hay ký tự đặc biệt)
        String txnRef = "VELORA" + System.currentTimeMillis();

        PackageTransaction transaction = PackageTransaction.builder()
                .txnRef(txnRef)
                .user(user)
                .packageService(pkg)
                .amount(price)
                .status("PENDING")
                .build();
        packageTransactionRepository.save(transaction);

        long vnpAmount = price.multiply(new java.math.BigDecimal(100)).longValue();

        Map<String, String> vnpParams = new HashMap<>();
        vnpParams.put("vnp_Version", "2.1.0");
        vnpParams.put("vnp_Command", "pay");
        vnpParams.put("vnp_TmnCode", tmnCode.trim());
        vnpParams.put("vnp_Amount", String.valueOf(vnpAmount));
        vnpParams.put("vnp_CurrCode", "VND");
        vnpParams.put("vnp_TxnRef", txnRef);

        // Ép OrderInfo thành chuỗi thuần túy (Alphanumeric) để triệt tiêu mọi lỗi mã hóa
        vnpParams.put("vnp_OrderInfo", "ThanhToanGoi" + txnRef);
        vnpParams.put("vnp_OrderType", "other");
        vnpParams.put("vnp_Locale", "vn");
        vnpParams.put("vnp_ReturnUrl", callbackUrl.trim());

        // Xử lý triệt để IP nội bộ và Proxy (VNPay sẽ reject nếu IP có chứa dấu ":" hoặc ",")
        String vnpIpAddr = VNPayPaymentUtil.getIpAddress(request);
        if (vnpIpAddr == null || vnpIpAddr.contains(":") || vnpIpAddr.contains(",")) {
            vnpIpAddr = "127.0.0.1";
        }
        vnpParams.put("vnp_IpAddr", vnpIpAddr);

        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
        vnpParams.put("vnp_CreateDate", now.format(formatter));
        vnpParams.put("vnp_ExpireDate", now.plusMinutes(15).format(formatter));

        // 2. Tự build HashData và QueryUrl TÁCH BIỆT theo đúng chuẩn thuật toán của VNPay
        List<String> fieldNames = new ArrayList<>(vnpParams.keySet());
        Collections.sort(fieldNames);
        StringBuilder hashData = new StringBuilder();
        StringBuilder query = new StringBuilder();
        Iterator<String> itr = fieldNames.iterator();

        while (itr.hasNext()) {
            String fieldName = itr.next();
            String fieldValue = vnpParams.get(fieldName);
            if ((fieldValue != null) && (fieldValue.length() > 0)) {
                // HashData KHÔNG encode key, CHỈ encode value bằng US_ASCII
                hashData.append(fieldName);
                hashData.append('=');
                try {
                    hashData.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));

                    // QueryUrl encode CẢ key và value
                    query.append(URLEncoder.encode(fieldName, StandardCharsets.US_ASCII.toString()));
                    query.append('=');
                    query.append(URLEncoder.encode(fieldValue, StandardCharsets.US_ASCII.toString()));
                } catch (Exception e) {
                    throw new RuntimeException("Lỗi mã hóa URL", e);
                }

                if (itr.hasNext()) {
                    query.append('&');
                    hashData.append('&');
                }
            }
        }

        // 3. Trim secret key cẩn thận (rất hay dính ký tự ẩn \r khi Spring Boot đọc file properties)
        String myHashSecret = hashSecret.trim();
        String queryUrl = query.toString();
        String secureHash = VNPayPaymentUtil.hmacSHA512(myHashSecret, hashData.toString());
        String paymentUrl = apiUrl + "?" + queryUrl + "&vnp_SecureHash=" + secureHash;

        Map<String, Object> data = new HashMap<>();
        data.put("paymentUrl", paymentUrl);

        return ResponseEntity.ok(Map.of("data", data));
    }

    @GetMapping("/api/packages/vnpay-callback")
    public ResponseEntity<Void> vnpayCallback(@RequestParam Map<String, String> params, HttpServletResponse response) throws IOException {
        String secureHash = params.get("vnp_SecureHash");
        Map<String, String> verifyParams = new HashMap<>(params);
        verifyParams.remove("vnp_SecureHash");
        verifyParams.remove("vnp_SecureHashType");

        String queryUrl = VNPayPaymentUtil.buildQueryUrl(verifyParams);
        String calculatedHash = VNPayPaymentUtil.hmacSHA512(hashSecret, queryUrl);

        String frontendRedirectUrl = returnUrl;
        if (calculatedHash.equalsIgnoreCase(secureHash)) {
            String txnRef = params.get("vnp_TxnRef");
            String responseCode = params.get("vnp_ResponseCode");
            Optional<PackageTransaction> txOpt = packageTransactionRepository.findByTxnRef(txnRef);

            if (txOpt.isPresent()) {
                PackageTransaction tx = txOpt.get();
                if ("PENDING".equals(tx.getStatus())) {
                    if ("00".equals(responseCode)) {
                        tx.setStatus("SUCCESS");
                        tx.setVnpayTranNo(params.get("vnp_TransactionNo"));

                        // --- LOGIC CẤP QUYỀN CHO USER TẠI ĐÂY ---
                        User user = tx.getUser();
                        PackageService pkg = tx.getPackageService();

                        user.setCurrentPackage(pkg);

                        // Xác định hạn sử dụng (Ví dụ: So sánh số tiền để biết là mua tháng hay mua năm)
                        LocalDateTime now = LocalDateTime.now();
                        LocalDateTime expiryDate = user.getPackageExpiryDate() != null && user.getPackageExpiryDate().isAfter(now)
                                ? user.getPackageExpiryDate()
                                : now;

                        if (tx.getAmount().compareTo(java.math.BigDecimal.valueOf(pkg.getPriceYearly())) == 0) {
                            user.setPackageExpiryDate(expiryDate.plusYears(1));
                        } else {
                            user.setPackageExpiryDate(expiryDate.plusMonths(1));
                        }

                        userRepository.save(user); // Lưu thông tin gói mới cập nhật vào DB
                        // ----------------------------------------

                    } else {
                        tx.setStatus("FAILED");
                    }
                    packageTransactionRepository.save(tx);
                }
                frontendRedirectUrl += "?status=" + tx.getStatus().toLowerCase();
            }
        } else {
            frontendRedirectUrl += "?status=invalid_signature";
        }

        response.sendRedirect(frontendRedirectUrl);
        return ResponseEntity.status(HttpStatus.FOUND).build();
    }
}