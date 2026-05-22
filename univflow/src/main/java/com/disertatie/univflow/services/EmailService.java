package com.disertatie.univflow.services;

public interface EmailService {
    void sendVerificationEmail(String toEmail, String token, String frontendUrl);
    void sendPasswordResetEmail(String toEmail, String token, String frontendUrl);
    void sendEmailChangeVerification(String toEmail, String token, String frontendUrl);
}