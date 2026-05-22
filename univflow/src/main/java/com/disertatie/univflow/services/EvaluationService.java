package com.disertatie.univflow.services;

import com.disertatie.univflow.models.dto.EvaluationStatsDTO;

public interface EvaluationService {
    EvaluationStatsDTO getStats(String userEmail);
}
