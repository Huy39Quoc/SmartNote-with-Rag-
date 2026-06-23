package org.example.velora.service;

import org.example.velora.entity.PackageService;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public interface UserPackageService {

    List<PackageService> getActivePackages();

}