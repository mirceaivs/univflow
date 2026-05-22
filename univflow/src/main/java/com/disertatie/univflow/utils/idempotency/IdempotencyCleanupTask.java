package com.disertatie.univflow.utils.idempotency;

import com.disertatie.univflow.repositories.IdempotencyRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
public class IdempotencyCleanupTask {

    private final IdempotencyRepository repository;

    public IdempotencyCleanupTask(IdempotencyRepository repository) {
        this.repository = repository;
    }

    
    @Scheduled(fixedRate = 60000)
    @Transactional
    public void cleanupExpiredRecords() {
        repository.deleteByExpiresAtBefore(LocalDateTime.now());
    }
}