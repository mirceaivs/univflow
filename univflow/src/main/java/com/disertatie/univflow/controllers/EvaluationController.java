package com.disertatie.univflow.controllers;

import com.disertatie.univflow.models.dto.EvaluationStatsDTO;
import com.disertatie.univflow.services.EvaluationService;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/evaluations")
public class EvaluationController {

    private final EvaluationService evaluationService;

    public EvaluationController(EvaluationService evaluationService) {
        this.evaluationService = evaluationService;
    }

    private String getCurrentUserEmail() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    @GetMapping("/stats")
    public EvaluationStatsDTO getStats() {
        return evaluationService.getStats(getCurrentUserEmail());
    }
}
