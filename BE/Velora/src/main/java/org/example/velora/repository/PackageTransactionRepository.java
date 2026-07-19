package org.example.velora.repository;

import org.example.velora.entity.PackageTransaction;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PackageTransactionRepository extends JpaRepository<PackageTransaction, UUID>, JpaSpecificationExecutor<PackageTransaction> {

    @EntityGraph(attributePaths = {"user", "packageService"})
    Optional<PackageTransaction> findByTxnRef(String txnRef);

    @EntityGraph(attributePaths = {"user", "packageService"})
    @Query("select transaction from PackageTransaction transaction where transaction.id = :id")
    Optional<PackageTransaction> findWithDetailsById(@Param("id") UUID id);
    long countByPackageService_Id(UUID packageId);
}
