package com.disertatie.univflow.services;

import com.disertatie.univflow.models.dto.QuizDTO;
import com.disertatie.univflow.models.dto.QuizHistoryDTO;
import java.util.List;

public interface QuizService {
    QuizDTO saveGeneratedQuiz(String courseId, String topic, String difficulty, String contentJson, String userEmail);
    List<QuizDTO> getQuizzesForCourse(String courseId, String userEmail);
    void submitQuizScore(String quizId, Integer score, String userEmail);
    void saveQuizSession(String quizId, String sessionStateJson, String userEmail);
    List<QuizHistoryDTO> getUserQuizHistory(String userEmail);
    List<QuizDTO> getPendingQuizzes(String userEmail);
    void deleteQuiz(String quizId, String userEmail);
}