package org.example.velora.service;

import org.example.velora.dto.request.TransactionRequest;
import org.example.velora.dto.response.TransactionResponse;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.util.UUID;

public interface TransactionService {
    TransactionResponse.Page getTransactions(String status, String keyword, LocalDate from, LocalDate to, Pageable pageable);
    TransactionResponse.Item getTransaction(UUID id);
    TransactionResponse.Revenue getRevenue(LocalDate from, LocalDate to);
    TransactionResponse.VnpayResult reconcile(UUID id);
    TransactionResponse.VnpayResult refund(UUID id, TransactionRequest.Refund request);
    TransactionResponse.Item updateStatus(UUID id, TransactionRequest.UpdateStatus request);
    void extendSubscription(UUID userId, TransactionRequest.ExtendSubscription request);
    void cancelSubscription(UUID userId, TransactionRequest.CancelSubscription request);
}
