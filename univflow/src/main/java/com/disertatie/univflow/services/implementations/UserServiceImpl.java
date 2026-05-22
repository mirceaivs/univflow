package com.disertatie.univflow.services.implementations;
import com.disertatie.univflow.models.AppUser;
import com.disertatie.univflow.models.UserProfile;
import com.disertatie.univflow.models.dto.UserDTO;
import com.disertatie.univflow.models.dto.mapper.UserMapper;
import com.disertatie.univflow.repositories.AppUserRepository;
import com.disertatie.univflow.repositories.UserProfileRepository;
import com.disertatie.univflow.repositories.RefreshTokenRepository;
import com.disertatie.univflow.repositories.VerificationTokenRepository;
import com.disertatie.univflow.repositories.QuizAttemptRepository;
import com.disertatie.univflow.services.UserService;
import com.disertatie.univflow.services.CourseService;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class UserServiceImpl implements UserService {

    private final AppUserRepository userRepository;
    private final UserProfileRepository profileRepository;
    private final PasswordEncoder passwordEncoder;
    private final CourseService courseService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final VerificationTokenRepository verificationTokenRepository;
    private final QuizAttemptRepository quizAttemptRepository;

    @Autowired
    public UserServiceImpl(AppUserRepository userRepository,
                           UserProfileRepository profileRepository,
                           PasswordEncoder passwordEncoder,
                           CourseService courseService,
                           RefreshTokenRepository refreshTokenRepository,
                           VerificationTokenRepository verificationTokenRepository,
                           QuizAttemptRepository quizAttemptRepository) {
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.passwordEncoder = passwordEncoder;
        this.courseService = courseService;
        this.refreshTokenRepository = refreshTokenRepository;
        this.verificationTokenRepository = verificationTokenRepository;
        this.quizAttemptRepository = quizAttemptRepository;
    }

    @Override
    public UserDTO getCurrentUserProfile(String email) {
        AppUser user = userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Utilizatorul nu a fost găsit"));
        UserProfile profile = profileRepository.findByUserId(user.getId()).orElse(null);
        return UserMapper.toDTO(user, profile);
    }

    @Override
    @Transactional
    public UserDTO updateUser(String email, UserDTO dto) {
        AppUser user = userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Utilizatorul nu a fost găsit"));

        UserProfile profile = profileRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    UserProfile p = new UserProfile();
                    p.setUser(user);
                    return p;
                });

        
        if (dto.getFirstName() != null) profile.setFirstName(dto.getFirstName());
        if (dto.getLastName() != null) profile.setLastName(dto.getLastName());

        
        if (dto.getAvatarUrl() != null) profile.setAvatarUrl(dto.getAvatarUrl());

        profileRepository.save(profile);
        return UserMapper.toDTO(user, profile);
    }

    @Override
    @Transactional
    public void deleteUser(String email) {
        AppUser user = userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Utilizatorul nu a fost găsit"));

        
        courseService.deleteAllUserCourses(email);

        
        quizAttemptRepository.deleteAllByUserId(user.getId());

        
        refreshTokenRepository.deleteByAppUser(user);
        verificationTokenRepository.deleteByUser(user);

        
        userRepository.delete(user);
    }

    @Override
    @Transactional
    public void changePassword(String email, String oldPassword, String newPassword) {
        AppUser user = userRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Utilizatorul nu a fost găsit"));

        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new IllegalArgumentException("Parola curentă este incorectă");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
}