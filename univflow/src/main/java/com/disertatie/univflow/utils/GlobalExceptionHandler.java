package com.disertatie.univflow.utils;

import com.disertatie.univflow.errors.ConcurrentRequestException;
import com.disertatie.univflow.errors.EmailNotVerifiedException;
import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.reactive.resource.NoResourceFoundException;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, String>> handleJpaConstraintViolation(ConstraintViolationException ex) {
        log.warn("ConstraintViolationException caught: {}", ex.getMessage());
        Map<String, String> errors = new HashMap<>();
        ex.getConstraintViolations().forEach(cv -> {
            String path = cv.getPropertyPath().toString();
            errors.put(path, cv.getMessage());
        });

        return ResponseEntity.badRequest().body(errors);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.warn("DataIntegrityViolationException caught: {}", ex.getMessage());

        
        Throwable mostSpecificCause = ex.getMostSpecificCause();
        String rootMessage = (mostSpecificCause != null && mostSpecificCause.getMessage() != null)
                ? mostSpecificCause.getMessage().toLowerCase()
                : "";

        String userFriendlyMessage;

        
        if (rootMessage.contains("null value") || rootMessage.contains("not-null")) {
            userFriendlyMessage = "Eroare: Lipsesc date obligatorii din cererea ta (Bad Request).";
        }
        
        else if (rootMessage.contains("duplicate key") || rootMessage.contains("unique constraint")) {
            userFriendlyMessage = "Eroare: Această înregistrare există deja în sistem (Duplicate).";
        }
        
        else {
            userFriendlyMessage = "Eroare de integritate a datelor la nivelul bazei de date.";
        }

        return ResponseEntity.badRequest().body(Map.of("error", userFriendlyMessage));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Object> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Bad Request (IllegalArgumentException): {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleRequestBodyValidation(MethodArgumentNotValidException ex) {
        log.warn("MethodArgumentNotValidException caught: {}", ex.getMessage());
        Map<String, String> errors = new HashMap<>();
        ex.getBindingResult()
                .getFieldErrors()
                .forEach(err -> errors.put(err.getField(), err.getDefaultMessage()));

        return ResponseEntity.badRequest().body(errors);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Object> handleIllegalState(IllegalStateException ex) {
        log.warn("Illegal state error: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", ex.getMessage()));
    }


    @ExceptionHandler({UsernameNotFoundException.class, BadCredentialsException.class, DisabledException.class})
    public ResponseEntity<Object> handleAuthenticationFailure(Exception ex) {
        log.warn("Authentication failure: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", ex.getMessage()));
    }


    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Object> handleTokenAndAccountErrors(RuntimeException ex) {
        log.warn("Token or Account logic error: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Object> handleEntityNotFound(EntityNotFoundException ex) {
        log.warn("Entity not found: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<Object> handleNoResourceFound(NoResourceFoundException ex) {
        log.warn("Endpoint invalid apelat: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", "Endpoint-ul apelat nu există pe server. Te rog verifică URL-ul."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Object> handleAllOthers(Exception ex) {
        log.error("Unhandled exception: {}", ex.getMessage(), ex);
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "A apărut o eroare neașteptată pe server."));
    }

    @ExceptionHandler(ConcurrentRequestException.class)
    public ResponseEntity<Object> handleConcurrencyConflict(ConcurrentRequestException ex) {
        log.warn("Spam / Concurrent request detected: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(EmailNotVerifiedException.class)
    public ResponseEntity<Object> handleEmailNotVerified(EmailNotVerifiedException ex) {
        log.warn("Email not verified login attempt: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of(
                    "error", "EMAIL_NOT_VERIFIED",
                    "message", ex.getMessage()
                ));
    }

    @ExceptionHandler(io.jsonwebtoken.JwtException.class)
    public ResponseEntity<Object> handleCryptographicFailures(io.jsonwebtoken.JwtException ex) {
        log.warn("JWT Security Exception: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", "Autentificare eșuată. Token invalid sau expirat."));
    }
}