package com.disertatie.univflow.services.implementations;

import com.disertatie.univflow.models.RefreshToken;
import com.disertatie.univflow.repositories.AppUserRepository;
import com.disertatie.univflow.repositories.RefreshTokenRepository;
import com.disertatie.univflow.services.RefreshTokenService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class RefreshTokenServiceImpl implements RefreshTokenService {

    @Value("${security.jwt.refresh-token.expiration}")
    private Long refreshTokenDurationMs;

    private final RefreshTokenRepository refreshTokenRepository;
    private final AppUserRepository appUserRepository;

    public RefreshTokenServiceImpl(RefreshTokenRepository refreshTokenRepository, AppUserRepository appUserRepository) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.appUserRepository = appUserRepository;
    }

    @Override
    public Optional<RefreshToken> findByToken(String token) {
        return refreshTokenRepository.findByToken(token);
    }

    @Override
    @Transactional
    public RefreshToken createRefreshToken(Long userId) {
        RefreshToken refreshToken = new RefreshToken();

        refreshToken.setAppUser(appUserRepository.findById(userId).orElseThrow(
                () -> new RuntimeException("Entitatea utilizatorului nu a fost găsită în timpul generării token-ului")
        ));

        refreshToken.setExpiryDate(Instant.now().plusMillis(refreshTokenDurationMs));
        refreshToken.setToken(UUID.randomUUID().toString());

        return refreshTokenRepository.save(refreshToken);
    }

    @Override
    @Transactional
    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token.getExpiryDate().compareTo(Instant.now()) < 0) {
            refreshTokenRepository.delete(token);
            throw new RuntimeException("Refresh token-ul a expirat. Vă rugăm să vă autentificați din nou");
        }
        return token;
    }

    @Override
    @Transactional
    public int deleteByUserId(Long userId) {
        return refreshTokenRepository.deleteAllByAppUserId(userId);
    }

    @Override
    @Transactional
    public void deleteByTokenString(String tokenString) {
        refreshTokenRepository.findByToken(tokenString).ifPresent(refreshTokenRepository::delete);
    }
}