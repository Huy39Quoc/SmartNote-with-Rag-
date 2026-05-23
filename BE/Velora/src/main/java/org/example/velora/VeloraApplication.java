package org.example.velora;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableAsync        // cần thiết cho @Async trong DocumentServiceImpl
@EnableScheduling   // cần thiết cho @Scheduled (nhắc deadline)
public class VeloraApplication {
    public static void main(String[] args) {
        SpringApplication.run(VeloraApplication.class, args);
    }
}
