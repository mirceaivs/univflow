package com.disertatie.univflow.services;

import io.jsonwebtoken.Claims;
import org.springframework.security.core.userdetails.UserDetails;
import java.util.List;
import java.util.function.Function;


public interface JwtService {
    String extractUserId(String token);

    List<String> extractRoles(String token);

    <T> T extractClaim(String token, Function<Claims, T> claimsResolver);

    boolean isTokenValid(String token);

    String generateToken(UserDetails userDetails, Long userId);
}