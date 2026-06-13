package org.example.velora.repository;

import org.example.velora.entity.PackageService;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PackageServiceRepository extends JpaRepository<PackageService, UUID> {

    // Thêm dòng này để sửa lỗi "cannot find symbol findByName"
    Optional<PackageService> findByName(String name);

    // Nếu hệ thống của bạn có dùng hàm findByIsActiveTrue() ở UserPackageController, hãy giữ nguyên nó
    List<PackageService> findByIsActiveTrue();
}