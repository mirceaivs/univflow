package com.disertatie.univflow.models.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuizHistoryDTO {
    private String attemptId;
    private String quizId;
    private String courseId;
    private String courseName;
    private String topic;
    private Integer score;
    private LocalDateTime completedAt;
}