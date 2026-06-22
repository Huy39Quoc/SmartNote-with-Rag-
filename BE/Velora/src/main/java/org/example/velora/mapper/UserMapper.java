package org.example.velora.mapper;

import org.example.velora.dto.response.UserResponse;
import org.example.velora.entity.PackageService;
import org.example.velora.entity.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public UserResponse.Profile toProfile(User u) {
        return toProfile(u, 0L, 0L);
    }

    public UserResponse.Profile toProfile(User u, Long noteCount, Long storageUsedBytes) {
        PackageService pkg = u.getCurrentPackage();

        String packageName = pkg != null ? pkg.getName() : "FREE";
        Integer maxAi = pkg != null ? pkg.getMaxAiFormatsPerMonth() : 10;
        Integer maxNotes = pkg != null ? pkg.getMaxNotes() : 50;
        Integer storageGb = pkg != null ? pkg.getStorageGb() : 1;
        Integer maxDevices = pkg != null ? pkg.getMaxDevices() : 1;
        String features = pkg != null ? pkg.getFeatures() : "";

        return UserResponse.Profile.builder()
                .id(u.getId())
                .email(u.getEmail())
                .fullName(u.getFullName())
                .role(u.getRole())
                .createdAt(u.getCreatedAt())

                .packageName(packageName)
                .packageExpiryDate(u.getPackageExpiryDate())
                .aiUsedThisMonth(u.getAiUsedThisMonth() != null ? u.getAiUsedThisMonth() : 0)
                .maxAiFormatsPerMonth(maxAi)
                .maxNotes(maxNotes)
                .storageGb(storageGb)
                .maxDevices(maxDevices)
                .packageFeatures(features)

                .noteCount(noteCount != null ? noteCount : 0L)
                .storageUsedBytes(storageUsedBytes != null ? storageUsedBytes : 0L)
                .build();
    }
}