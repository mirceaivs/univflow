package com.disertatie.univflow.controllers;

import com.disertatie.univflow.repositories.IdempotencyRepository;
import com.disertatie.univflow.services.PythonIntegrationService;
import com.disertatie.univflow.utils.idempotency.Idempotent;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;


@RestController
@RequestMapping("/rag")
public class RagController {

    private final PythonIntegrationService pythonIntegrationService;
    private final IdempotencyRepository idempotencyRepository;

    public RagController(PythonIntegrationService pythonIntegrationService, IdempotencyRepository idempotencyRepository) {
        this.pythonIntegrationService = pythonIntegrationService;
        this.idempotencyRepository = idempotencyRepository;
    }

    @Idempotent(seconds = 300)
    @PostMapping(value = "/ask", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> askQuestion(
            @RequestBody Map<String, Object> payload) { 

        String question = (String) payload.get("question");
        String courseId = (String) payload.get("courseId"); 
        
        boolean reasoningEnabled = false;
        if (payload.containsKey("reasoning_enabled")) {
            reasoningEnabled = Boolean.parseBoolean(payload.get("reasoning_enabled").toString());
        }

        if (question == null || question.trim().isEmpty() || courseId == null) {
            throw new IllegalArgumentException("Întrebarea și id-ul cursului sunt obligatorii.");
        }

        return pythonIntegrationService.askAiQuestion(question, courseId, reasoningEnabled);
    }

    @PostMapping("/stop")
    public ResponseEntity<String> stopGeneration(
            @RequestBody Map<String, String> payload) { 

        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        String courseId = payload.get("courseId"); 

        pythonIntegrationService.triggerStop(email, courseId);

        try {
            String hashToCancel;
            if (payload.containsKey("originalBody")) {
                hashToCancel = generateHash(email, "POST", "/rag/ask", payload.get("originalBody"));
            } else {
                String question = payload.get("question");
                String simulatedBody = String.format("{\"question\":\"%s\"}", question);
                hashToCancel = generateHash(email, "POST", "/rag/ask", simulatedBody);
            }
            idempotencyRepository.deleteById(hashToCancel);

            return ResponseEntity.ok("Generare oprită și lock eliberat.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Eroare la eliberare lock.");
        }
    }

    private String generateHash(String principal, String method, String uri, String body) throws NoSuchAlgorithmException {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        String data = principal + "|" + method + "|" + uri + "|" + body;
        byte[] hashBytes = digest.digest(data.getBytes(StandardCharsets.UTF_8));
        return HexFormat.of().formatHex(hashBytes);
    }

    @GetMapping("/health-check-python")
    public ResponseEntity<Map<String, String>> checkPythonServicesConnection() {
        return ResponseEntity.ok(pythonIntegrationService.checkAllPythonHealth());
    }

    @GetMapping("/history/{courseId}")
    public Mono<ResponseEntity<String>> getChatHistory(
            @PathVariable("courseId") String courseId,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size) {

        
        if (size > 100) {
            size = 100;
        }

        String userId = SecurityContextHolder.getContext().getAuthentication().getName();
        return pythonIntegrationService.getPaginatedChatHistory(courseId, userId, page, size)
                .map(jsonResponse -> ResponseEntity.ok()
                        .header("Content-Type", "application/json")
                        .body(jsonResponse))
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @PostMapping(value = "/quiz/{courseId}/generate", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<String> generateQuiz(
            @PathVariable String courseId,
            @RequestBody Map<String, Object> payload) {

        String email = SecurityContextHolder.getContext().getAuthentication().getName();

        String topic = payload.getOrDefault("topic", "conceptele principale").toString();
        String difficulty = payload.getOrDefault("difficulty", "Mediu").toString();
        int numQuestions = Integer.parseInt(payload.getOrDefault("numQuestions", "5").toString());
        int optionsPerQuestion = Integer.parseInt(payload.getOrDefault("optionsPerQuestion", "4").toString());
        boolean allowMultipleCorrect = Boolean.parseBoolean(payload.getOrDefault("allowMultipleCorrect", "false").toString());

        String quizJson = pythonIntegrationService.generateQuiz(
                courseId, topic, difficulty, numQuestions, optionsPerQuestion, allowMultipleCorrect, email);

        return ResponseEntity.ok(quizJson);
    }
}