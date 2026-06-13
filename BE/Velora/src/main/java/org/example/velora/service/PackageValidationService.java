package org.example.velora.service;

import org.example.velora.entity.PackageService;
import org.example.velora.entity.User;
import org.springframework.stereotype.Service;

@Service
public interface PackageValidationService {
    void validateAiUsage(User user, String requiredFeature);
    void validateStorageLimit(User user, long newFileSizeBytes);
    PackageService getActivePackage(User user);
    void resetAiCounterIfNewMonth(User user);
    void incrementAiUsage(User user);
    void validateMaxNotes(User user);
    void validateFeatureAccess(User user, String featureCode);
    void validateMaxDevices(User user);
}
