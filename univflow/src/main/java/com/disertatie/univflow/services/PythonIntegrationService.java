package com.disertatie.univflow.services;

import com.disertatie.univflow.models.dto.IngestResponseDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

public interface PythonIntegrationService {
    ResponseEntity<StreamingResponseBody> askAiQuestionStream(String question, String courseId);
    IngestResponseDTO uploadDocumentToPython(String courseId, List<MultipartFile> files);
    Map<String, String> checkAllPythonHealth();
    void triggerStop(String email, String courseId);
    public void deleteDocumentData(String jobId);
    void deleteEntireCourseData(String courseId);
    public Mono<String> getPaginatedChatHistory(String courseId, String userId, int page, int size);
    String generateQuiz(String courseId, String topic, String difficulty, int numQuestions, int optionsPerQuestion, boolean allowMultipleCorrect, String userEmail);
    Map<String, Object> getIngestionJobStatus(String jobId);
}