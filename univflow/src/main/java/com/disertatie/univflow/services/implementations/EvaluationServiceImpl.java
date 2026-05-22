package com.disertatie.univflow.services.implementations;

import com.disertatie.univflow.models.AppUser;
import com.disertatie.univflow.models.QuizAttempt;
import com.disertatie.univflow.models.dto.EvaluationStatsDTO;
import com.disertatie.univflow.repositories.AppUserRepository;
import com.disertatie.univflow.repositories.QuizAttemptRepository;
import com.disertatie.univflow.services.EvaluationService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EvaluationServiceImpl implements EvaluationService {

    private final QuizAttemptRepository quizAttemptRepository;
    private final AppUserRepository appUserRepository;

    public EvaluationServiceImpl(QuizAttemptRepository quizAttemptRepository,
                                  AppUserRepository appUserRepository) {
        this.quizAttemptRepository = quizAttemptRepository;
        this.appUserRepository = appUserRepository;
    }

    @Override
    public EvaluationStatsDTO getStats(String userEmail) {
        AppUser user = appUserRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Utilizatorul nu a fost găsit: " + userEmail));

        List<QuizAttempt> attempts = quizAttemptRepository.findAllByUserId(user.getId());
        long totalCompleted = attempts.size();

        if (totalCompleted == 0) {
            return new EvaluationStatsDTO(0, 0.0, 0.0);
        }

        
        
        double averageScore = attempts.stream()
                .filter(a -> a.getScore() != null)
                .mapToInt(QuizAttempt::getScore)
                .average()
                .orElse(0.0) / 10.0;

        
        long passed = attempts.stream()
                .filter(a -> a.getScore() != null && a.getScore() >= 50)
                .count();
        double successRate = totalCompleted > 0 ? (double) passed / (double) totalCompleted * 100.0 : 0.0;

        return new EvaluationStatsDTO(totalCompleted, averageScore, successRate);
    }
}
