package com.disertatie.univflow.repositories;

import com.disertatie.univflow.models.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CourseRepository extends JpaRepository<Course, String> {
    List<Course> findAllByOwnerId(Long ownerId);
    Optional<Course> findByIdAndOwnerId(String id, Long ownerId);
}