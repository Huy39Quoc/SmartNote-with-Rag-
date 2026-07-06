
        package org.example.velora.service;

import org.example.velora.entity.PackageService;
import org.example.velora.entity.User;

import java.util.List;

public interface UserPackageService {

    List<PackageService> getActivePackages();

    PackageService getDefaultFreePackage();

    PackageService getActivePackage(User user);

    void checkFeatureAccess(User user, String featureCode);

    void checkAiUsage(User user, String requiredFeature);

    void checkStorageLimit(User user, long newFileSizeBytes);

    void checkMaxNotes(User user);

    void checkMaxDevices(User user);

    void increaseAiUsage(User user);


}

