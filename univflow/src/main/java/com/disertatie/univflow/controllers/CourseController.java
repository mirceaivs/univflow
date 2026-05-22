package com.disertatie.univflow.controllers;

import com.disertatie.univflow.models.dto.CourseDTO;
import com.disertatie.univflow.models.dto.DocumentDTO;
import com.disertatie.univflow.services.CourseService;
import com.disertatie.univflow.services.DocumentService;
import com.disertatie.univflow.services.PythonIntegrationService;
import com.disertatie.univflow.utils.idempotency.Idempotent;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/courses")
public class CourseController {

    private final CourseService courseService;
    private final DocumentService documentService;
    private final PythonIntegrationService pythonService;


    public CourseController(CourseService courseService, DocumentService documentService, PythonIntegrationService pythonService) {
        this.courseService = courseService;
        this.documentService = documentService;
        this.pythonService = pythonService;
    }

    private String getCurrentUserEmail() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    @Idempotent(seconds = 10)
    @PostMapping("/create")
    public ResponseEntity<CourseDTO> create(@Valid @RequestBody CourseDTO dto) { 
        CourseDTO createdCourse = courseService.createCourse(dto, getCurrentUserEmail());
        return ResponseEntity.status(HttpStatus.CREATED).body(createdCourse);
    }

    @GetMapping("/my-courses")
    public ResponseEntity<List<CourseDTO>> list() {
        List<CourseDTO> courses = courseService.getAllUserCourses(getCurrentUserEmail());
        return ResponseEntity.ok(courses);
    }


    @GetMapping("/{id}")
    public ResponseEntity<CourseDTO> getCourse(@PathVariable String id) {
        CourseDTO course = courseService.getCourseById(id, getCurrentUserEmail());
        return ResponseEntity.ok(course);
    }

    @GetMapping("/jobs/{jobId}/status")
    public ResponseEntity<Map<String, Object>> getJobStatus(@PathVariable String jobId) {
        return ResponseEntity.ok(pythonService.getIngestionJobStatus(jobId));
    }

    @Idempotent(seconds = 10)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCourse(@PathVariable String id) {
        courseService.deleteCourse(id, getCurrentUserEmail());
        return ResponseEntity.noContent().build();
    }

    @Idempotent(seconds = 10)
    @DeleteMapping
    public ResponseEntity<Void> deleteAllCourses() {
        courseService.deleteAllUserCourses(getCurrentUserEmail());
        return ResponseEntity.noContent().build();
    }

    @Idempotent(seconds = 10)
    @PostMapping("/{id}/documents")
    public ResponseEntity<?> uploadDocuments(@PathVariable String id, @RequestParam("files") List<MultipartFile> files) {
        
        return courseService.uploadDocumentsToCourse(id, getCurrentUserEmail(), files);
    }


    @GetMapping
    public ResponseEntity<List<DocumentDTO>> getDocumentsByCourse(@RequestParam String courseId) {
        
        List<DocumentDTO> docs = documentService.getDocumentsByCourse(courseId);
        return ResponseEntity.ok(docs);
    }

    @Idempotent(seconds = 5)
    @PutMapping("/{id}")
    public ResponseEntity<CourseDTO> updateCourse(@PathVariable String id, @RequestBody CourseDTO dto) {
        CourseDTO updatedCourse = courseService.updateCourse(id, dto, getCurrentUserEmail());
        return ResponseEntity.ok(updatedCourse);
    }

    @PutMapping("/{courseId}/touch")
    public ResponseEntity<Void> touchCourse(@PathVariable String courseId) {
        courseService.touchCourse(courseId, getCurrentUserEmail());
        return ResponseEntity.ok().build();
    }
}