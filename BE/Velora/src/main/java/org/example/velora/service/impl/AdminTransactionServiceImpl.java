package org.example.velora.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.velora.dto.request.AdminTransactionRequest;
import org.example.velora.dto.response.AdminTransactionResponse;
import org.example.velora.entity.*;
import org.example.velora.exception.BadRequestException;
import org.example.velora.exception.ResourceNotFoundException;
import org.example.velora.repository.*;
import org.example.velora.service.AdminTransactionService;
import org.example.velora.util.VNPayPaymentUtil;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.text.Normalizer;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminTransactionServiceImpl implements AdminTransactionService {
    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter VNP_DATE = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final Set<String> EDITABLE_STATUSES = Set.of("PENDING", "SUCCESS", "FAILED", "CANCELLED");

    private final PackageTransactionRepository transactionRepository;
    private final UserRepository userRepository;
    private final PackageServiceRepository packageRepository;
    private final ActivityLogRepository activityLogRepository;

    @Value("${vnpay.tmn-code:DEFAULT_TMN}") private String tmnCode;
    @Value("${vnpay.hash-secret:DEFAULT_SECRET}") private String hashSecret;
    @Value("${vnpay.transaction-api-url:https://sandbox.vnpayment.vn/merchant_webapi/api/transaction}") private String transactionApiUrl;

    @Override
    @Transactional(readOnly = true)
    public AdminTransactionResponse.Page getTransactions(String status, String keyword, LocalDate from, LocalDate to, Pageable pageable) {
        Specification<PackageTransaction> spec = Specification.where(null);
        if (status != null && !status.isBlank())
            spec = spec.and((root, query, cb) -> cb.equal(cb.upper(root.get("status")), status.toUpperCase()));
        if (keyword != null && !keyword.isBlank()) {
            String search = "%" + keyword.toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                cb.like(cb.lower(root.get("txnRef")), search),
                cb.like(cb.lower(root.join("user").get("email")), search),
                cb.like(cb.lower(root.join("packageService").get("name")), search)
            ));
        }
        if (from != null) spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("createdAt"), from.atStartOfDay()));
        if (to != null) spec = spec.and((root, query, cb) -> cb.lessThan(root.get("createdAt"), to.plusDays(1).atStartOfDay()));
        var page = transactionRepository.findAll(spec, pageable);
        return AdminTransactionResponse.Page.builder()
            .content(page.getContent().stream().map(this::toItem).toList())
            .pageNumber(page.getNumber()).pageSize(page.getSize())
            .totalElements(page.getTotalElements()).totalPages(page.getTotalPages()).build();
    }

    @Override @Transactional(readOnly = true)
    public AdminTransactionResponse.Item getTransaction(UUID id) { return toItem(find(id)); }

    @Override
    @Transactional(readOnly = true)
    public AdminTransactionResponse.Revenue getRevenue(LocalDate from, LocalDate to) {
        LocalDate start = from == null ? LocalDate.now(VN_ZONE).minusDays(29) : from;
        LocalDate end = to == null ? LocalDate.now(VN_ZONE) : to;
        Specification<PackageTransaction> spec = (root, query, cb) -> cb.and(
            root.get("status").in("SUCCESS", "REFUNDED", "REFUND_PENDING"),
            cb.greaterThanOrEqualTo(root.get("createdAt"), start.atStartOfDay()),
            cb.lessThan(root.get("createdAt"), end.plusDays(1).atStartOfDay())
        );
        List<PackageTransaction> transactions = transactionRepository.findAll(spec);
        BigDecimal gross = transactions.stream().map(PackageTransaction::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal refunded = transactions.stream().map(tx -> tx.getRefundAmount() == null ? BigDecimal.ZERO : tx.getRefundAmount())
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, BigDecimal> byDay = groupRevenue(transactions, tx -> tx.getCreatedAt().toLocalDate().toString());
        Map<String, BigDecimal> byMonth = groupRevenue(transactions, tx -> tx.getCreatedAt().format(DateTimeFormatter.ofPattern("yyyy-MM")));
        Map<String, BigDecimal> byPackage = groupRevenue(transactions, tx -> tx.getPackageService().getName());
        return AdminTransactionResponse.Revenue.builder().grossRevenue(gross).refundedAmount(refunded)
            .netRevenue(gross.subtract(refunded)).successfulTransactions(transactions.size())
            .byDay(byDay).byMonth(byMonth).byPackage(byPackage).build();
    }

    @Override
    public AdminTransactionResponse.VnpayResult reconcile(UUID id) {
        PackageTransaction transaction = find(id);
        Map<String, String> response = callVnpay(buildQueryRequest(transaction));
        if ("00".equals(response.get("vnp_ResponseCode"))) {
            applyVnpayState(transaction, response);
            transactionRepository.save(transaction);
        }
        audit("TRANSACTION_RECONCILED", transaction, response.toString());
        return toVnpayResult(response);
    }

    @Override
    public AdminTransactionResponse.VnpayResult refund(UUID id, AdminTransactionRequest.Refund request) {
        PackageTransaction transaction = find(id);
        if (!"SUCCESS".equals(transaction.getStatus()) && !"REFUND_PENDING".equals(transaction.getStatus()))
            throw new BadRequestException("Chỉ giao dịch thành công mới có thể hoàn tiền");
        if (transaction.getVnpayTranNo() == null)
            throw new BadRequestException("Giao dịch chưa có mã VNPay");
        BigDecimal alreadyRefunded = transaction.getRefundAmount() == null ? BigDecimal.ZERO : transaction.getRefundAmount();
        if (alreadyRefunded.add(request.getAmount()).compareTo(transaction.getAmount()) > 0)
            throw new BadRequestException("Tổng số tiền hoàn vượt quá giá trị giao dịch");

        Map<String, String> response = callVnpay(buildRefundRequest(transaction, request));
        if ("00".equals(response.get("vnp_ResponseCode"))) {
            transaction.setRefundAmount(alreadyRefunded.add(request.getAmount()));
            transaction.setStatus("REFUND_PENDING");
            transaction.setAdminNote(request.getReason());
            transactionRepository.save(transaction);
        }
        audit("TRANSACTION_REFUND_REQUESTED", transaction, request.getAmount() + " - " + response);
        return toVnpayResult(response);
    }

    @Override
    public AdminTransactionResponse.Item updateStatus(UUID id, AdminTransactionRequest.UpdateStatus request) {
        PackageTransaction transaction = find(id);
        String status = request.getStatus().toUpperCase();
        if (!EDITABLE_STATUSES.contains(status)) throw new BadRequestException("Trạng thái không hợp lệ");
        String previous = transaction.getStatus();
        transaction.setStatus(status);
        transaction.setAdminNote(request.getNote());
        if ("SUCCESS".equals(status) && !"SUCCESS".equals(previous)) activateSubscription(transaction);
        transactionRepository.save(transaction);
        audit("TRANSACTION_STATUS_UPDATED", transaction, previous + " -> " + status + ": " + request.getNote());
        return toItem(transaction);
    }

    @Override
    public void extendSubscription(UUID userId, AdminTransactionRequest.ExtendSubscription request) {
        User user = findUser(userId);
        if (user.getCurrentPackage() == null) throw new BadRequestException("Người dùng chưa có gói để gia hạn");
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime base = user.getPackageExpiryDate() != null && user.getPackageExpiryDate().isAfter(now) ? user.getPackageExpiryDate() : now;
        user.setPackageExpiryDate(base.plusMonths(request.getMonths()));
        userRepository.save(user);
        audit("SUBSCRIPTION_EXTENDED", null, user.getEmail() + ": +" + request.getMonths() + " tháng - " + request.getReason());
    }

    @Override
    public void cancelSubscription(UUID userId, AdminTransactionRequest.CancelSubscription request) {
        User user = findUser(userId);
        PackageService free = packageRepository.findByName("FREE").orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy gói FREE"));
        user.setCurrentPackage(free);
        user.setPackageExpiryDate(null);
        userRepository.save(user);
        audit("SUBSCRIPTION_CANCELLED", null, user.getEmail() + " - " + request.getReason());
    }

    private Map<String, String> buildQueryRequest(PackageTransaction tx) {
        String requestId = requestId(); String createDate = nowString(); String transactionDate = tx.getCreatedAt().format(VNP_DATE);
        String orderInfo = "Query transaction " + tx.getTxnRef(); String ip = "127.0.0.1";
        String data = String.join("|", requestId, "2.1.0", "querydr", tmnCode.trim(), tx.getTxnRef(), transactionDate, createDate, ip, orderInfo);
        Map<String, String> body = new LinkedHashMap<>();
        body.put("vnp_RequestId", requestId); body.put("vnp_Version", "2.1.0"); body.put("vnp_Command", "querydr");
        body.put("vnp_TmnCode", tmnCode.trim()); body.put("vnp_TxnRef", tx.getTxnRef()); body.put("vnp_OrderInfo", orderInfo);
        body.put("vnp_TransactionDate", transactionDate); body.put("vnp_CreateDate", createDate); body.put("vnp_IpAddr", ip);
        body.put("vnp_SecureHash", VNPayPaymentUtil.hmacSHA512(hashSecret.trim(), data)); return body;
    }

    private Map<String, String> buildRefundRequest(PackageTransaction tx, AdminTransactionRequest.Refund request) {
        String requestId = requestId(); String createDate = nowString(); String transactionDate = tx.getCreatedAt().format(VNP_DATE);
        String type = request.getAmount().compareTo(tx.getAmount()) == 0 ? "02" : "03";
        String amount = request.getAmount().multiply(BigDecimal.valueOf(100)).toBigInteger().toString();
        String createBy = sanitizeVnpText(currentAdmin()); String ip = "127.0.0.1"; String orderInfo = sanitizeVnpText(request.getReason());
        String data = String.join("|", requestId, "2.1.0", "refund", tmnCode.trim(), type, tx.getTxnRef(), amount,
            Objects.toString(tx.getVnpayTranNo(), ""), transactionDate, createBy, createDate, ip, orderInfo);
        Map<String, String> body = new LinkedHashMap<>();
        body.put("vnp_RequestId", requestId); body.put("vnp_Version", "2.1.0"); body.put("vnp_Command", "refund");
        body.put("vnp_TmnCode", tmnCode.trim()); body.put("vnp_TransactionType", type); body.put("vnp_TxnRef", tx.getTxnRef());
        body.put("vnp_Amount", amount); body.put("vnp_TransactionNo", Objects.toString(tx.getVnpayTranNo(), ""));
        body.put("vnp_TransactionDate", transactionDate); body.put("vnp_CreateBy", createBy); body.put("vnp_CreateDate", createDate);
        body.put("vnp_IpAddr", ip); body.put("vnp_OrderInfo", orderInfo);
        body.put("vnp_SecureHash", VNPayPaymentUtil.hmacSHA512(hashSecret.trim(), data)); return body;
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> callVnpay(Map<String, String> request) {
        try {
            Map<String, Object> response = RestClient.create().post().uri(transactionApiUrl).body(request).retrieve().body(Map.class);
            if (response == null) throw new BadRequestException("VNPay không trả về dữ liệu");
            Map<String, String> result = response.entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey, e -> Objects.toString(e.getValue(), "")));
            verifyVnpayResponse(result);
            return result;
        } catch (BadRequestException e) { throw e; }
        catch (Exception e) { throw new BadRequestException("Không thể kết nối VNPay: " + e.getMessage()); }
    }

    private void verifyVnpayResponse(Map<String, String> response) {
        String secureHash = response.get("vnp_SecureHash");
        if (secureHash == null || secureHash.isBlank()) throw new BadRequestException("VNPay response không có checksum");
        String data = String.join("|",
            responseValue(response, "vnp_ResponseId"), responseValue(response, "vnp_Command"),
            responseValue(response, "vnp_ResponseCode"), responseValue(response, "vnp_Message"),
            responseValue(response, "vnp_TmnCode"), responseValue(response, "vnp_TxnRef"),
            responseValue(response, "vnp_Amount"), responseValue(response, "vnp_BankCode"),
            responseValue(response, "vnp_PayDate"), responseValue(response, "vnp_TransactionNo"),
            responseValue(response, "vnp_TransactionType"), responseValue(response, "vnp_TransactionStatus"),
            responseValue(response, "vnp_OrderInfo"), responseValue(response, "vnp_PromotionCode"),
            responseValue(response, "vnp_PromotionAmount")
        );
        String expected = VNPayPaymentUtil.hmacSHA512(hashSecret.trim(), data);
        if (!expected.equalsIgnoreCase(secureHash)) throw new BadRequestException("Checksum response VNPay không hợp lệ");
    }

    private String responseValue(Map<String, String> response, String key) { return Objects.toString(response.get(key), ""); }

    private void applyVnpayState(PackageTransaction tx, Map<String, String> response) {
        tx.setVnpayTranNo(response.get("vnp_TransactionNo")); tx.setResponseCode(response.get("vnp_ResponseCode"));
        tx.setBankCode(response.get("vnp_BankCode")); tx.setPayDate(parseDate(response.get("vnp_PayDate")));
        String state = response.get("vnp_TransactionStatus"); String type = response.get("vnp_TransactionType");
        String previous = tx.getStatus();
        if (("02".equals(type) || "03".equals(type)) && "00".equals(state)) { tx.setStatus("REFUNDED"); tx.setRefundedAt(LocalDateTime.now()); }
        else if (Set.of("05", "06").contains(state)) tx.setStatus("REFUND_PENDING");
        else if ("00".equals(state)) tx.setStatus("SUCCESS");
        else if ("01".equals(state)) tx.setStatus("PENDING");
        else tx.setStatus("FAILED");
        if ("SUCCESS".equals(tx.getStatus()) && !"SUCCESS".equals(previous)) activateSubscription(tx);
    }

    private void activateSubscription(PackageTransaction tx) {
        User user = tx.getUser(); user.setCurrentPackage(tx.getPackageService());
        LocalDateTime now = LocalDateTime.now(); LocalDateTime base = user.getPackageExpiryDate() != null && user.getPackageExpiryDate().isAfter(now) ? user.getPackageExpiryDate() : now;
        user.setPackageExpiryDate("yearly".equalsIgnoreCase(tx.getBillingType()) ? base.plusYears(1) : base.plusMonths(1));
        userRepository.save(user);
    }

    private Map<String, BigDecimal> groupRevenue(List<PackageTransaction> values, java.util.function.Function<PackageTransaction, String> key) {
        return values.stream().collect(Collectors.groupingBy(key, TreeMap::new,
            Collectors.reducing(BigDecimal.ZERO, tx -> tx.getAmount().subtract(tx.getRefundAmount() == null ? BigDecimal.ZERO : tx.getRefundAmount()), BigDecimal::add)));
    }
    private PackageTransaction find(UUID id) { return transactionRepository.findWithDetailsById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch")); }
    private User findUser(UUID id) { return userRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy người dùng")); }
    private String currentAdmin() { return SecurityContextHolder.getContext().getAuthentication().getName(); }
    private String requestId() { return UUID.randomUUID().toString().replace("-", "").substring(0, 32); }
    private String nowString() { return LocalDateTime.now(VN_ZONE).format(VNP_DATE); }
    private String sanitizeVnpText(String value) {
        String ascii = Normalizer.normalize(Objects.toString(value, "admin"), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        ascii = ascii.replaceAll("[^A-Za-z0-9 ]", "").trim();
        return ascii.isBlank() ? "admin" : ascii.substring(0, Math.min(ascii.length(), 200));
    }
    private LocalDateTime parseDate(String value) { try { return value == null || value.isBlank() ? null : LocalDateTime.parse(value, VNP_DATE); } catch (Exception e) { return null; } }
    private void audit(String action, PackageTransaction tx, String detail) { activityLogRepository.save(ActivityLog.builder().action(action).entityType("PACKAGE_TRANSACTION").entityId(tx == null ? null : tx.getId()).detail(detail).build()); }
    private AdminTransactionResponse.VnpayResult toVnpayResult(Map<String, String> value) { return AdminTransactionResponse.VnpayResult.builder().responseCode(value.get("vnp_ResponseCode")).message(value.get("vnp_Message")).transactionStatus(value.get("vnp_TransactionStatus")).transactionType(value.get("vnp_TransactionType")).raw(value).build(); }
    private AdminTransactionResponse.Item toItem(PackageTransaction tx) { return AdminTransactionResponse.Item.builder()
        .id(tx.getId()).txnRef(tx.getTxnRef()).vnpayTranNo(tx.getVnpayTranNo()).userId(tx.getUser().getId()).userEmail(tx.getUser().getEmail()).userName(tx.getUser().getFullName())
        .packageId(tx.getPackageService().getId()).packageName(tx.getPackageService().getName()).billingType(tx.getBillingType()).amount(tx.getAmount()).status(tx.getStatus())
        .responseCode(tx.getResponseCode()).bankCode(tx.getBankCode()).payDate(tx.getPayDate()).refundAmount(tx.getRefundAmount()).refundedAt(tx.getRefundedAt()).adminNote(tx.getAdminNote())
        .createdAt(tx.getCreatedAt()).updatedAt(tx.getUpdatedAt()).build(); }
}
