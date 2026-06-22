package org.example.velora.service;

import org.example.velora.entity.PackageService;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface UserPackageService {

    List<PackageService> getActivePackages();

    Map<String, Object> checkoutPackage(UUID packageId, String type, String email, String clientIp);

    String handleVNPayCallback(Map<String, String> params);
}