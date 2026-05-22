package com.disertatie.univflow.controllers;

import com.disertatie.univflow.models.dto.QuizDTO;
import com.disertatie.univflow.models.dto.QuizHistoryDTO;
import com.disertatie.univflow.services.QuizService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/quizzes")
public class QuizController {

    private final QuizService quizService;

    public QuizController(QuizService quizService) {
        this.quizService = quizService;
    }

    private String getCurrentUserEmail() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    @GetMapping("/pending")
    public ResponseEntity<List<QuizDTO>> getPendingQuizzes() {
        return ResponseEntity.ok(quizService.getPendingQuizzes(getCurrentUserEmail()));
    }

    
    @PostMapping("/course/{courseId}")
    public ResponseEntity<QuizDTO> saveQuiz(
            @PathVariable String courseId,
            @RequestBody Map<String, String> payload) {

        QuizDTO savedQuizDTO = quizService.saveGeneratedQuiz(
                courseId,
                payload.get("topic"),
                payload.get("difficulty"),
                payload.get("contentJson"),
                getCurrentUserEmail()
        );
        return ResponseEntity.ok(savedQuizDTO);
    }

    
    @GetMapping("/course/{courseId}")
    public ResponseEntity<List<QuizDTO>> getQuizzes(@PathVariable String courseId) {
        return ResponseEntity.ok(quizService.getQuizzesForCourse(courseId, getCurrentUserEmail()));
    }

    
    @PostMapping("/{quizId}/submit")
    public ResponseEntity<Map<String, String>> submitScore(
            @PathVariable String quizId,
            @RequestBody Map<String, Integer> payload) {

        quizService.submitQuizScore(quizId, payload.get("score"), getCurrentUserEmail());
        return ResponseEntity.ok(Map.of("message", "Scor salvat și progresul cursului a fost actualizat!"));
    }

    
    @PostMapping("/{quizId}/session")
    public ResponseEntity<Map<String, String>> saveSession(
            @PathVariable String quizId,
            @RequestBody Map<String, String> payload) {

        quizService.saveQuizSession(quizId, payload.get("sessionStateJson"), getCurrentUserEmail());
        return ResponseEntity.ok(Map.of("message", "Sesiunea testului a fost salvată!"));
    }

    
    @GetMapping("/history")
    public ResponseEntity<List<QuizHistoryDTO>> getMyHistory() {
        return ResponseEntity.ok(quizService.getUserQuizHistory(getCurrentUserEmail()));
    }

    @DeleteMapping("/{quizId}")
    public ResponseEntity<Void> deleteQuiz(@PathVariable String quizId) {
        quizService.deleteQuiz(quizId, getCurrentUserEmail());
        return ResponseEntity.noContent().build();
    }
}