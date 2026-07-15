package org.example.velora.repository;

import org.example.velora.entity.PackageService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PackageServiceRepository extends JpaRepository<PackageService, UUID> {

    Optional<PackageService> findByName(String name);
    List<PackageService> findByIsActiveTrue();
}
