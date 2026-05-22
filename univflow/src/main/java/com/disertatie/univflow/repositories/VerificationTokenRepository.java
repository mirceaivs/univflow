package com.disertatie.univflow.repositories;

import com.disertatie.univflow.models.AppUser;
import com.disertatie.univflow.models.VerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface VerificationTokenRepository extends JpaRepository<VerificationToken, Long> {
    Optional<VerificationToken> findByToken(String token);
    void deleteByUser(AppUser user);
}