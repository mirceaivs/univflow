package com.disertatie.univflow.services.implementations;

import com.disertatie.univflow.models.AppUser;
import com.disertatie.univflow.models.Course;
import com.disertatie.univflow.models.Document;
import com.disertatie.univflow.models.dto.CourseDTO;
import com.disertatie.univflow.models.dto.IngestResponseDTO;
import com.disertatie.univflow.models.Quiz;
import com.disertatie.univflow.repositories.AppUserRepository;
import com.disertatie.univflow.repositories.CourseRepository;
import com.disertatie.univflow.repositories.DocumentRepository;
import com.disertatie.univflow.repositories.QuizAttemptRepository;
import com.disertatie.univflow.repositories.QuizRepository;
import com.disertatie.univflow.services.CourseService;
import com.disertatie.univflow.services.DocumentService;
import com.disertatie.univflow.services.PythonIntegrationService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
public class CourseServiceImpl implements CourseService {

    private final CourseRepository courseRepository;
    private final AppUserRepository userRepository;
    private final DocumentRepository documentRepository;
    private final PythonIntegrationService pythonService;
    private final DocumentService documentService;
    private final QuizRepository quizRepository;
    private final QuizAttemptRepository quizAttemptRepository;

    public CourseServiceImpl(CourseRepository courseRepository,
                             AppUserRepository userRepository,
                             DocumentRepository documentRepository,
                             PythonIntegrationService pythonService,
                             DocumentService documentService,
                             QuizRepository quizRepository,
                             QuizAttemptRepository quizAttemptRepository) {
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
        this.documentRepository = documentRepository;
        this.pythonService = pythonService;
        this.documentService = documentService;
        this.quizRepository = quizRepository;
        this.quizAttemptRepository = quizAttemptRepository;
    }

    
    private AppUser getUserByEmail(String userEmail) {
        return userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UsernameNotFoundException("Utilizatorul nu a fost găsit cu email-ul: " + userEmail));
    }

    private CourseDTO toCourseDTO(Course c) {
        CourseDTO dto = new CourseDTO(c.getId(), c.getName(), c.getStudyYear(), c.getSemester(), c.getDescription(), c.getProgress());
        dto.setDocumentsCount(documentRepository.countByCourseId(c.getId()));
        dto.setLastAccessed(c.getLastAccessed());
        return dto;
    }

    @Override
    public CourseDTO createCourse(CourseDTO dto, String userEmail) {
        AppUser user = getUserByEmail(userEmail);
        Course course = Course.builder()
                .name(dto.getName())
                .studyYear(dto.getStudyYear())
                .semester(dto.getSemester())
                .description(dto.getDescription())
                .owner(user)
                
                .build();
        Course saved = courseRepository.save(course);
        CourseDTO created = new CourseDTO(saved.getId(), saved.getName(), saved.getStudyYear(), saved.getSemester(), saved.getDescription(), saved.getProgress());
        created.setDocumentsCount(0L);
        created.setLastAccessed(saved.getLastAccessed());
        return created;
    }

    @Override
    public List<CourseDTO> getAllUserCourses(String userEmail) {
        AppUser user = getUserByEmail(userEmail);
        return courseRepository.findAllByOwnerId(user.getId())
                .stream()
                .map(this::toCourseDTO)
                .collect(Collectors.toList());
    }

    @Override
    public CourseDTO getCourseById(String courseId, String userEmail) {
        AppUser user = getUserByEmail(userEmail);
        Course course = courseRepository.findByIdAndOwnerId(courseId, user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Cursul nu a fost găsit"));
        return toCourseDTO(course);
    }

    @Override
    @Transactional
    public void deleteCourse(String courseId, String userEmail) {
        AppUser user = getUserByEmail(userEmail);
        Course course = courseRepository.findByIdAndOwnerId(courseId, user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Cursul nu a fost găsit cu ID-ul: " + courseId));

        
        List<Quiz> quizzes = quizRepository.findAllByCourseIdOrderByCreatedAtDesc(courseId);
        for (Quiz quiz : quizzes) {
            quizAttemptRepository.deleteAllByQuizId(quiz.getId());
        }
        quizRepository.deleteAll(quizzes);

        
        pythonService.deleteEntireCourseData(courseId);

        
        documentRepository.deleteAllByCourseId(courseId);

        
        courseRepository.delete(course);

        log.info("Course {} and all associated AI data deleted by user {}", courseId, userEmail);
    }

    @Override
    @Transactional
    public void deleteAllUserCourses(String userEmail) {
        AppUser user = getUserByEmail(userEmail);
        List<Course> courses = courseRepository.findAllByOwnerId(user.getId());
        for (Course course : courses) {
            deleteCourse(course.getId(), userEmail);
        }
        log.info("All courses and associated data deleted for user {}", userEmail);
    }

    @Override
    @Transactional
    public void touchCourse(String courseId, String userEmail) {
        AppUser user = getUserByEmail(userEmail);
        Course course = courseRepository.findByIdAndOwnerId(courseId, user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Cursul nu a fost găsit"));
        course.setLastAccessed(LocalDateTime.now());
        courseRepository.save(course);
    }

    @Override
    @Transactional
    public ResponseEntity<?> uploadDocumentsToCourse(String courseId, String userEmail, List<MultipartFile> files) {
        AppUser user = getUserByEmail(userEmail);
        Course course = courseRepository.findByIdAndOwnerId(courseId, user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Cursul nu a fost găsit sau nu aveți permisiunea necesară."));

        for (MultipartFile file : files) {
            if (documentRepository.existsByCourseIdAndFileName(courseId, file.getOriginalFilename())) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "Fișierul '" + file.getOriginalFilename() + "' există deja în acest curs."));
            }
        }

        IngestResponseDTO pythonResponse = pythonService.uploadDocumentToPython(courseId, files);

        if (pythonResponse != null && pythonResponse.getJobs() != null) {
            List<Document> documentEntries = pythonResponse.getJobs().stream()
                    .map(job -> {
                        
                        String filename = job.getFileName();
                        String extension = "";
                        if (filename != null && filename.contains(".")) {
                            extension = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
                        }

                        return Document.builder()
                                .fileName(filename)
                                .jobId(job.getJobId())
                                .fileType(extension) 
                                .course(course)
                                .build();
                    })
                    .collect(Collectors.toList());

            documentRepository.saveAll(documentEntries);
        }

        return ResponseEntity.accepted().body(pythonResponse);
    }

    @Override
    @Transactional
    public CourseDTO updateCourse(String courseId, CourseDTO dto, String userEmail) {
        AppUser user = getUserByEmail(userEmail);

        Course course = courseRepository.findByIdAndOwnerId(courseId, user.getId())
                .orElseThrow(() -> new EntityNotFoundException("Cursul nu a fost găsit."));

        
        if (dto.getName() != null) course.setName(dto.getName());
        if (dto.getStudyYear() != null) course.setStudyYear(dto.getStudyYear());
        if (dto.getSemester() != null) course.setSemester(dto.getSemester());
        if (dto.getDescription() != null) course.setDescription(dto.getDescription());

        
        

        Course saved = courseRepository.save(course);
        return toCourseDTO(saved);
    }
}