package org.example.velora.repository;

import org.example.velora.entity.PackageTransaction;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PackageTransactionRepository extends JpaRepository<PackageTransaction, UUID> {

    @EntityGraph(attributePaths = {"user", "packageService"})
    Optional<PackageTransaction> findByTxnRef(String txnRef);
}