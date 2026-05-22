package com.disertatie.univflow.repositories;

import com.disertatie.univflow.models.QuizAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, String> {

    
    List<QuizAttempt> findAllByUserId(Long userId);

    
    List<QuizAttempt> findAllByUserIdOrderByCompletedAtDesc(Long userId);

    
    @Query("SELECT AVG(qa.score) FROM QuizAttempt qa WHERE qa.quiz.course.id = :courseId AND qa.user.id = :userId")
    Double getAverageScoreByCourseAndUser(@Param("courseId") String courseId, @Param("userId") Long userId);
    void deleteAllByQuizId(String quizId);
    void deleteAllByUserId(Long userId);
}