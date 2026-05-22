package com.disertatie.univflow.services;

import com.disertatie.univflow.models.RefreshToken;
import java.util.Optional;

public interface RefreshTokenService {
    Optional<RefreshToken> findByToken(String token);

    RefreshToken createRefreshToken(Long userId);

    RefreshToken verifyExpiration(RefreshToken token);

    int deleteByUserId(Long userId);

    void deleteByTokenString(String tokenString);
}