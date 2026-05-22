package com.disertatie.univflow.services.implementations;

import com.disertatie.univflow.services.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value; 
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@Async
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String defaultFrontendUrl;

    @Autowired
    public EmailServiceImpl(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    private String resolveFrontendUrl(String frontendUrl) {
        if (frontendUrl == null || frontendUrl.trim().isEmpty()) {
            return defaultFrontendUrl;
        }
        return frontendUrl;
    }

    @Override
    public void sendVerificationEmail(String toEmail, String token, String frontendUrl) {
        String baseUrl = resolveFrontendUrl(frontendUrl);
        String verificationUrl = baseUrl + "/?mode=verify&token=" + token;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Account Activation - UnivFlow");
        message.setText("Welcome to UnivFlow!\n\n" +
                "Please click the link below to activate your account:\n" +
                verificationUrl + "\n\n" +
                "This link will expire in 1 hour.");

        mailSender.send(message);
    }

    @Override
    public void sendPasswordResetEmail(String toEmail, String token, String frontendUrl) {
        String baseUrl = resolveFrontendUrl(frontendUrl);
        String resetUrl = baseUrl + "/?mode=reset&token=" + token;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Password Reset - UnivFlow");
        message.setText("You have requested to reset your password for your UnivFlow account.\n\n" +
                "Click the link below to set a new password:\n" +
                resetUrl + "\n\n" +
                "If you did not make this request, you can safely ignore this email.");

        mailSender.send(message);
    }

    @Override
    public void sendEmailChangeVerification(String toEmail, String token, String frontendUrl) {
        String baseUrl = resolveFrontendUrl(frontendUrl);
        String verificationUrl = baseUrl + "/?mode=verify-email-change&token=" + token;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Confirm Email Change - UnivFlow");
        message.setText("You requested to change your UnivFlow account email to this address.\n\n" +
                "Please click the link below to confirm the change:\n" +
                verificationUrl + "\n\n" +
                "If you did not request this, please ignore this email.");

        mailSender.send(message);
    }
}