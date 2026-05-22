package com.disertatie.univflow.services;

import com.disertatie.univflow.models.dto.CourseDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface CourseService {
    CourseDTO createCourse(CourseDTO dto, String userEmail);
    List<CourseDTO> getAllUserCourses(String userEmail);
    CourseDTO getCourseById(String courseId, String userEmail);
    void deleteCourse(String courseId, String userEmail);
    void deleteAllUserCourses(String userEmail);
    void touchCourse(String courseId, String userEmail);
    ResponseEntity<?> uploadDocumentsToCourse(String courseId, String userEmail, List<MultipartFile> files);
    CourseDTO updateCourse(String courseId, CourseDTO dto, String userEmail);
}