package org.example.velora.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.velora.entity.User;
import org.example.velora.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.example.velora.entity.PackageService;
import org.example.velora.repository.PackageServiceRepository;
@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PackageServiceRepository packageServiceRepository;
    @Value("${app.admin.email:admin@velora.local}")
    private String adminEmail;

    @Value("${app.admin.password:admin123}")
    private String adminPassword;

    @Value("${app.admin.full-name:Velora Admin}")
    private String adminFullName;

    @Override
    @Transactional
    public void run(String... args) {
        seedPackages();

        userRepository.findByEmail(adminEmail).ifPresentOrElse(
                this::ensureAdmin,
                this::createAdmin
        );
    }

    private void createAdmin() {
        User admin = User.builder()
                .email(adminEmail)
                .passwordHash(passwordEncoder.encode(adminPassword))
                .fullName(adminFullName)
                .role(User.Role.ADMIN)
                .isActive(true)
                .build();

        userRepository.save(admin);

        log.info("Default admin account created: email={}, password={}",
                adminEmail, adminPassword);
    }

    private void ensureAdmin(User user) {
        boolean changed = false;

        if (user.getRole() != User.Role.ADMIN) {
            user.setRole(User.Role.ADMIN);
            changed = true;
        }

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            user.setIsActive(true);
            changed = true;
        }

        if (user.getFullName() == null || user.getFullName().isBlank()) {
            user.setFullName(adminFullName);
            changed = true;
        }

        if (changed) {
            userRepository.save(user);
            log.info("Existing admin account fixed: email={}", adminEmail);
        } else {
            log.info("Default admin account already exists: email={}", adminEmail);
        }
    }
    private void seedPackages() {
        upsertPackage(
                "FREE",
                0.0,
                0.0,
                "Gói miễn phí dành cho người dùng mới. Phù hợp để ghi chú, tag, upload tài liệu cơ bản và dùng AI cơ bản.",
                50,
                10,
                1,
                1,
                "TAG_SUBJECT,CHECKLIST_BASIC,AI_NOTE_FORMAT,AI_SUMMARY_BASIC,AI_CHAT,DOCUMENT_UPLOAD"
        );

        upsertPackage(
        "PRO",
        49000.0,
        390000.0,
        "Gói Pro mở khóa ghi chú không giới hạn, AI nâng cao, flashcard, deadline thông minh và export tài liệu.",
        -1,
        -1,
        2,
        3,
        "TAG_SUBJECT,CHECKLIST_BASIC,AI_NOTE_FORMAT,AI_SUMMARY_BASIC,AI_SUMMARY_ADVANCED,AI_CHAT,AI_ANALYZE,DOCUMENT_UPLOAD,EXTRACT_SCHEDULE,DEADLINE_MANAGEMENT,PRIORITY_SUGGESTION,AI_FLASHCARD,EXPORT_FILE,AI_AUDIO"
);

        upsertPackage(
        "PLUS",
        99000.0,
        790000.0,
        "Gói Plus dành cho nhóm học tập/team nhỏ, bao gồm toàn bộ Pro và các tính năng học nhóm, dashboard nhóm, chia sẻ ghi chú.",
        -1,
        -1,
        10,
        -1,
        "TAG_SUBJECT,CHECKLIST_BASIC,AI_NOTE_FORMAT,AI_SUMMARY_BASIC,AI_SUMMARY_ADVANCED,AI_CHAT,AI_ANALYZE,DOCUMENT_UPLOAD,EXTRACT_SCHEDULE,DEADLINE_MANAGEMENT,PRIORITY_SUGGESTION,AI_FLASHCARD,EXPORT_FILE,TEAM_WORK,AI_PROGRESS_ANALYTICS,TEAM_DASHBOARD,GOOGLE_CALENDAR,MANAGE_MEMBERS,CUSTOM_WORKSPACE,PRIORITY_SUPPORT,AI_AUDIO"
);
    }

    private void upsertPackage(
            String name,
            Double priceMonthly,
            Double priceYearly,
            String description,
            Integer maxNotes,
            Integer maxAiFormatsPerMonth,
            Integer storageGb,
            Integer maxDevices,
            String features
    ) {
        PackageService pkg = packageServiceRepository.findByName(name)
                .orElseGet(PackageService::new);

        pkg.setName(name);
        pkg.setPriceMonthly(priceMonthly);
        pkg.setPriceYearly(priceYearly);
        pkg.setDescription(description);
        pkg.setMaxNotes(maxNotes);
        pkg.setMaxAiFormatsPerMonth(maxAiFormatsPerMonth);
        pkg.setStorageGb(storageGb);
        pkg.setMaxDevices(maxDevices);
        pkg.setFeatures(features);
        pkg.setIsActive(true);

        packageServiceRepository.save(pkg);
    }
}
