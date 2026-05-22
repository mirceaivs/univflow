package com.disertatie.univflow.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @NoArgsConstructor @AllArgsConstructor
public class EvaluationStatsDTO {
    private long totalCompleted;
    private double averageScore;  
    private double successRate;   
}
