package org.example.velora.service.impl;

import lombok.RequiredArgsConstructor;
import org.example.velora.entity.PackageService;
import org.example.velora.repository.PackageServiceRepository;
import org.example.velora.service.UserPackageService;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserPackageServiceImpl implements UserPackageService {

    private final PackageServiceRepository packageServiceRepository;

    @Override
    public List<PackageService> getActivePackages() {
        return packageServiceRepository.findByIsActiveTrue();
    }
}
