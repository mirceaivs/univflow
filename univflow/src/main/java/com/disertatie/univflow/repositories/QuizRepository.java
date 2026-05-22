package com.disertatie.univflow.repositories;

import com.disertatie.univflow.models.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface QuizRepository extends JpaRepository<Quiz, String> {
    List<Quiz> findAllByCourseIdOrderByCreatedAtDesc(String courseId);

    
    List<Quiz> findAllByCourse_Owner_Id(Long ownerId);
}