package org.example.velora.service;

import org.example.velora.dto.request.AdminTransactionRequest;
import org.example.velora.dto.response.AdminTransactionResponse;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.UUID;

public interface AdminTransactionService {
    AdminTransactionResponse.Page getTransactions(String status, String keyword, LocalDate from, LocalDate to, Pageable pageable);
    AdminTransactionResponse.Item getTransaction(UUID id);
    AdminTransactionResponse.Revenue getRevenue(LocalDate from, LocalDate to);
    AdminTransactionResponse.VnpayResult reconcile(UUID id);
    AdminTransactionResponse.VnpayResult refund(UUID id, AdminTransactionRequest.Refund request);
    AdminTransactionResponse.Item updateStatus(UUID id, AdminTransactionRequest.UpdateStatus request);
    void extendSubscription(UUID userId, AdminTransactionRequest.ExtendSubscription request);
    void cancelSubscription(UUID userId, AdminTransactionRequest.CancelSubscription request);
}
