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

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.email:admin@velora.local}")
    private String adminEmail;

    @Value("${app.admin.password:admin123}")
    private String adminPassword;

    @Value("${app.admin.full-name:Velora Admin}")
    private String adminFullName;

    @Override
    @Transactional
    public void run(String... args) {
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
}