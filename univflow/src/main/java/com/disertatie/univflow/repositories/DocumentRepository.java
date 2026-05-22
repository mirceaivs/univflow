package com.disertatie.univflow.repositories;

import com.disertatie.univflow.models.Document;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;


public interface DocumentRepository extends JpaRepository<Document, String> {
    boolean existsByCourseIdAndFileName(String courseId, String fileName);
    List<Document> findAllByCourseId(String courseId);
    long countByCourseId(String courseId);
    void deleteAllByCourseId(String courseId);
}