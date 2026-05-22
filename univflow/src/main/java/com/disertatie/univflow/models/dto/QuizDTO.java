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
public class QuizDTO {
    private String id;
    private String courseId;
    private String topic;
    private String difficulty;
    private String contentJson;
    private String sessionStateJson;
    private LocalDateTime createdAt;
}