package com.disertatie.univflow.controllers;

import com.disertatie.univflow.models.dto.*;
import com.disertatie.univflow.services.AuthService;
import com.disertatie.univflow.utils.idempotency.Idempotent;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.beans.factory.annotation.Value;

import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authenticationService;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    @Autowired
    public AuthController(AuthService authenticationService) {
        this.authenticationService = authenticationService;
    }

    @Idempotent(seconds = 10)
    @PostMapping("/register")
    public ResponseEntity<UserDTO> register(@Valid @RequestBody RegisterDTO registerDTO) {
        return ResponseEntity.ok(authenticationService.register(registerDTO));
    }

    @GetMapping("/verify")
    public ResponseEntity<Map<String, String>> verifyUser(@RequestParam("token") String token) {
        authenticationService.verifyUser(token);
        return ResponseEntity.ok(Map.of("message", "Account activated successfully!"));
    }

    @Idempotent(seconds = 30)
    @PostMapping("/resend-verification")
    public ResponseEntity<Map<String, String>> resendVerification(@RequestParam("email") String email) {
        authenticationService.resendVerificationToken(email);
        return ResponseEntity.ok(Map.of("message", "Verification email resent successfully!"));
    }

    @Idempotent(seconds = 30)
    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@RequestParam("email") String email) {
        authenticationService.forgotPassword(email);
        return ResponseEntity.ok(Map.of("message", "Reset email sent!"));
    }

    @Idempotent(seconds = 10)
    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestParam("token") String token,
                                                             @RequestParam("newPassword") String newPassword) {
        authenticationService.resetPassword(token, newPassword);
        return ResponseEntity.ok(Map.of("message", "Password reset successfully!"));
    }

    @Idempotent(seconds = 5)
    @PostMapping("/login")
    public ResponseEntity<UserDTO> login(@Valid @RequestBody LoginDTO loginDTO, HttpServletResponse response) {
        UserDTO userDTO = authenticationService.login(loginDTO);

        ResponseCookie accessCookie = ResponseCookie.from("accessToken", userDTO.getToken())
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(15 * 60)
                .sameSite("Strict")
                .build();

        ResponseCookie refreshCookie = ResponseCookie.from("refreshToken", userDTO.getRefreshToken())
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(7 * 24 * 60 * 60)
                .sameSite("Strict")
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, refreshCookie.toString());

        return ResponseEntity.ok(userDTO);
    }

    @PostMapping("/refresh")
    public ResponseEntity<Void> refreshToken(@CookieValue(name = "refreshToken", required = false) String refreshToken, HttpServletResponse response) {
        if (refreshToken == null || refreshToken.isEmpty()) {
            return ResponseEntity.status(401).build();
        }

        try {
            AuthResponse authResponse = authenticationService.refreshToken(refreshToken);

            ResponseCookie accessCookie = ResponseCookie.from("accessToken", authResponse.getAccessToken())
                    .httpOnly(true)
                    .secure(true)
                    .path("/")
                    .maxAge(15 * 60)
                    .sameSite("Strict")
                    .build();

            response.addHeader(HttpHeaders.SET_COOKIE, accessCookie.toString());
            return ResponseEntity.ok().build();

        } catch (Exception e) {
            return clearCookies(response, 403);
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@CookieValue(name = "refreshToken", required = false) String refreshToken, HttpServletResponse response) {
        if (refreshToken != null && !refreshToken.isEmpty()) {
            try {
                authenticationService.logout(refreshToken);
            } catch (Exception e) {}
        }

        return clearCookies(response, 200);
    }

    private ResponseEntity<Void> clearCookies(HttpServletResponse response, int statusCode) {
        ResponseCookie cleanAccess = ResponseCookie.from("accessToken", "")
                .httpOnly(true).secure(true).path("/").maxAge(0).sameSite("Strict").build();
        ResponseCookie cleanRefresh = ResponseCookie.from("refreshToken", "")
                .httpOnly(true).secure(true).path("/").maxAge(0).sameSite("Strict").build();

        response.addHeader(HttpHeaders.SET_COOKIE, cleanAccess.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, cleanRefresh.toString());

        return ResponseEntity.status(statusCode).build();
    }

    @GetMapping("/verify-email-change")
    public ResponseEntity<Map<String, String>> verifyEmailChange(@RequestParam("token") String token, HttpServletResponse response) {
        authenticationService.confirmEmailChange(token);
        
        ResponseCookie cleanAccess = ResponseCookie.from("accessToken", "")
                .httpOnly(true).secure(true).path("/").maxAge(0).sameSite("Strict").build();
        ResponseCookie cleanRefresh = ResponseCookie.from("refreshToken", "")
                .httpOnly(true).secure(true).path("/").maxAge(0).sameSite("Strict").build();

        response.addHeader(HttpHeaders.SET_COOKIE, cleanAccess.toString());
        response.addHeader(HttpHeaders.SET_COOKIE, cleanRefresh.toString());
        
        return ResponseEntity.ok(Map.of("message", "Your email address has been successfully updated. You can now log in with the new address."));
    }
}