package com.disertatie.univflow.services.implementations;

import com.disertatie.univflow.models.AppUser;
import com.disertatie.univflow.models.Course;
import com.disertatie.univflow.models.Quiz;
import com.disertatie.univflow.models.QuizAttempt;
import com.disertatie.univflow.models.dto.QuizDTO;
import com.disertatie.univflow.models.dto.QuizHistoryDTO;
import com.disertatie.univflow.repositories.AppUserRepository;
import com.disertatie.univflow.repositories.CourseRepository;
import com.disertatie.univflow.repositories.QuizAttemptRepository;
import com.disertatie.univflow.repositories.QuizRepository;
import com.disertatie.univflow.services.QuizService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class QuizServiceImpl implements QuizService {

    private final QuizRepository quizRepository;
    private final QuizAttemptRepository quizAttemptRepository;
    private final CourseRepository courseRepository;
    private final AppUserRepository userRepository;

    public QuizServiceImpl(QuizRepository quizRepository,
                           QuizAttemptRepository quizAttemptRepository,
                           CourseRepository courseRepository,
                           AppUserRepository userRepository) {
        this.quizRepository = quizRepository;
        this.quizAttemptRepository = quizAttemptRepository;
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
    }

    private AppUser getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Utilizatorul nu a fost găsit: " + email));
    }

    @Override
    @Transactional
    public QuizDTO saveGeneratedQuiz(String courseId, String topic, String difficulty, String contentJson, String userEmail) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new EntityNotFoundException("Cursul nu a fost găsit"));

        Quiz quiz = Quiz.builder()
                .course(course)
                .topic(topic)
                .difficulty(difficulty)
                .contentJson(contentJson)
                .build();

        Quiz savedQuiz = quizRepository.save(quiz);

        return QuizDTO.builder()
                .id(savedQuiz.getId())
                .courseId(course.getId())
                .topic(savedQuiz.getTopic())
                .difficulty(savedQuiz.getDifficulty())
                .contentJson(savedQuiz.getContentJson())
                .sessionStateJson(savedQuiz.getSessionStateJson())
                .createdAt(savedQuiz.getCreatedAt())
                .build();
    }

    @Override
    public List<QuizDTO> getQuizzesForCourse(String courseId, String userEmail) {
        List<Quiz> quizzes = quizRepository.findAllByCourseIdOrderByCreatedAtDesc(courseId);

        return quizzes.stream().map(q -> QuizDTO.builder()
                .id(q.getId())
                .courseId(q.getCourse().getId())
                .topic(q.getTopic())
                .difficulty(q.getDifficulty())
                .contentJson(q.getContentJson())
                .sessionStateJson(q.getSessionStateJson())
                .createdAt(q.getCreatedAt())
                .build()
        ).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void submitQuizScore(String quizId, Integer score, String userEmail) {
        AppUser user = getUserByEmail(userEmail);
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new EntityNotFoundException("Testul nu a fost găsit"));

        QuizAttempt attempt = QuizAttempt.builder()
                .quiz(quiz)
                .user(user)
                .score(score)
                .build();
        quizAttemptRepository.save(attempt);

        
        Double avgScore = quizAttemptRepository.getAverageScoreByCourseAndUser(quiz.getCourse().getId(), user.getId());
        if (avgScore != null) {
            Course course = quiz.getCourse();
            course.setProgress(avgScore.intValue());
            courseRepository.save(course);
        }
    }

    @Override
    @Transactional
    public void saveQuizSession(String quizId, String sessionStateJson, String userEmail) {
        AppUser user = getUserByEmail(userEmail);
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new EntityNotFoundException("Testul nu a fost găsit"));

        if (!quiz.getCourse().getOwner().getId().equals(user.getId())) {
            throw new IllegalStateException("Nu aveți permisiunea de a modifica acest test.");
        }

        quiz.setSessionStateJson(sessionStateJson);
        quizRepository.save(quiz);
    }

    @Override
    public List<QuizHistoryDTO> getUserQuizHistory(String userEmail) {
        AppUser user = getUserByEmail(userEmail);
        List<QuizAttempt> attempts = quizAttemptRepository.findAllByUserIdOrderByCompletedAtDesc(user.getId());

        return attempts.stream().map(a -> QuizHistoryDTO.builder()
                .attemptId(a.getId())
                .quizId(a.getQuiz().getId())
                .courseId(a.getQuiz().getCourse().getId())
                .courseName(a.getQuiz().getCourse().getName())
                .topic(a.getQuiz().getTopic())
                .score(a.getScore())
                .completedAt(a.getCompletedAt())
                .build()
        ).collect(Collectors.toList());
    }

    @Override
    public List<QuizDTO> getPendingQuizzes(String userEmail) {
        AppUser user = getUserByEmail(userEmail);

        
        List<Quiz> allMyQuizzes = quizRepository.findAllByCourse_Owner_Id(user.getId());

        List<String> attemptedQuizIds = quizAttemptRepository.findAllByUserId(user.getId())
                .stream()
                .map(attempt -> attempt.getQuiz().getId())
                .collect(Collectors.toList());

        return allMyQuizzes.stream()
                .filter(quiz -> !attemptedQuizIds.contains(quiz.getId()))
                .map(q -> QuizDTO.builder()
                        .id(q.getId())
                        .courseId(q.getCourse().getId())
                        .topic(q.getTopic())
                        .difficulty(q.getDifficulty())
                        .contentJson(q.getContentJson())
                        .sessionStateJson(q.getSessionStateJson())
                        .createdAt(q.getCreatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteQuiz(String quizId, String userEmail) {
        
        AppUser user = getUserByEmail(userEmail);

        
        Quiz quiz = quizRepository.findById(quizId)
                .orElseThrow(() -> new EntityNotFoundException("Testul cu ID-ul " + quizId + " nu a fost găsit."));

        
        
        if (!quiz.getCourse().getOwner().getId().equals(user.getId())) {
            
            
            throw new IllegalStateException("Nu aveți permisiunea de a șterge acest test. Nu sunteți proprietarul cursului respectiv.");
        }

        try {
            
            
            quizAttemptRepository.deleteAllByQuizId(quizId);

            
            quizRepository.delete(quiz);

        } catch (Exception e) {
            
            
            throw new RuntimeException("A apărut o eroare la ștergerea testului: " + e.getMessage());
        }
    }
}