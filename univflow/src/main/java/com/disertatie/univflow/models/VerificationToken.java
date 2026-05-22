package com.disertatie.univflow.models;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "Verification_Token")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class VerificationToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String token;

    @OneToOne(targetEntity = AppUser.class, fetch = FetchType.EAGER)
    @JoinColumn(nullable = false, name = "id_user")
    private AppUser user;

    @Column(nullable = false)
    private LocalDateTime expiryDate;
}