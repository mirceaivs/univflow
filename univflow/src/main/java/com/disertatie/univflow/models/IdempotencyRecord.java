package com.disertatie.univflow.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "global_idempotency_store", indexes = {
        @Index(name = "idx_expiration", columnList = "expiresAt")
})
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class IdempotencyRecord {

    @Id
    @Column(length = 64, nullable = false)
    private String requestHash;

    @Column(nullable = false, updatable = false)
    private String principalSubject;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ProcessState state;

    @Column(columnDefinition = "TEXT")
    private String responsePayload;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    public enum ProcessState { IN_PROGRESS, COMPLETED, FAILED }
}