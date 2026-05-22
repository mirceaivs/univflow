package com.disertatie.univflow.services.implementations;

import com.disertatie.univflow.models.*;
import com.disertatie.univflow.models.dto.AuthResponse;
import com.disertatie.univflow.models.dto.LoginDTO;
import com.disertatie.univflow.models.dto.RegisterDTO;
import com.disertatie.univflow.models.dto.UserDTO;
import com.disertatie.univflow.models.dto.mapper.UserMapper;
import com.disertatie.univflow.repositories.AppUserRepository;
import com.disertatie.univflow.repositories.RoleRepository;
import com.disertatie.univflow.repositories.UserProfileRepository;
import com.disertatie.univflow.repositories.VerificationTokenRepository;
import com.disertatie.univflow.services.AuthService;
import com.disertatie.univflow.services.EmailService;
import com.disertatie.univflow.services.JwtService;
import com.disertatie.univflow.services.RefreshTokenService;
import com.disertatie.univflow.errors.EmailNotVerifiedException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class AuthServiceImpl implements AuthService {

    private final AppUserRepository userRepository;
    private final UserProfileRepository profileRepository;
    private final RoleRepository roleRepository;
    private final VerificationTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final RefreshTokenService refreshTokenService;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String defaultFrontendUrl;

    @Autowired
    private org.springframework.context.ApplicationContext applicationContext;

    private String getFrontendUrl() {
        try {
            org.springframework.web.context.request.RequestAttributes attribs = org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
            if (attribs instanceof org.springframework.web.context.request.ServletRequestAttributes) {
                jakarta.servlet.http.HttpServletRequest request = ((org.springframework.web.context.request.ServletRequestAttributes) attribs).getRequest();
                String origin = request.getHeader("Origin");
                if (origin != null && !origin.trim().isEmpty()) {
                    return origin;
                }
                String referer = request.getHeader("Referer");
                if (referer != null && !referer.trim().isEmpty()) {
                    java.net.URI uri = new java.net.URI(referer);
                    return uri.getScheme() + "://" + uri.getAuthority();
                }
            }
        } catch (Exception e) {
            
        }
        return defaultFrontendUrl;
    }

    @Autowired
    public AuthServiceImpl(
            AppUserRepository userRepository,
            UserProfileRepository profileRepository,
            RoleRepository roleRepository,
            VerificationTokenRepository tokenRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            EmailService emailService,
            RefreshTokenService refreshTokenService) {
        this.userRepository = userRepository;
        this.profileRepository = profileRepository;
        this.roleRepository = roleRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.emailService = emailService;
        this.refreshTokenService = refreshTokenService;
    }

    @Override
    @Transactional
    public UserDTO register(RegisterDTO input) {
        if (userRepository.findByEmail(input.getEmail()).isPresent()) {
            throw new BadCredentialsException("Adresa de email este deja utilizată!");
        }

        Role role = roleRepository.findByName("ROLE_USER")
                .orElseGet(() -> roleRepository.save(Role.builder().name("ROLE_USER").build()));

        AppUser user = new AppUser();
        user.setEmail(input.getEmail());
        user.setPassword(passwordEncoder.encode(input.getPassword()));
        user.setRole(role);
        user.setEnabled(false);

        AppUser savedUser = userRepository.save(user);

        String token = UUID.randomUUID().toString();
        createVerificationToken(savedUser, token);

        emailService.sendVerificationEmail(savedUser.getEmail(), token, getFrontendUrl());

        
        UserProfile profile = new UserProfile();
        profile.setUser(savedUser);
        profile.setFirstName(input.getFirstName());
        profile.setLastName(input.getLastName());

        UserProfile savedProfile = profileRepository.save(profile);

        return UserMapper.toDTO(savedUser, savedProfile);
    }

    @Override
    @Transactional
    public void verifyUser(String token) {
        VerificationToken verificationToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Token invalid sau inexistent"));

        if (verificationToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Link-ul de verificare a expirat");
        }

        AppUser user = verificationToken.getUser();
        user.setEnabled(true);
        userRepository.save(user);
        tokenRepository.delete(verificationToken);
    }

    @Override
    @Transactional
    public void forgotPassword(String email) {
        AppUser user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Nu a fost găsit niciun utilizator cu această adresă de email"));

        String token = UUID.randomUUID().toString();
        createVerificationToken(user, token);
        emailService.sendPasswordResetEmail(user.getEmail(), token, getFrontendUrl());
    }

    @Override
    @Transactional
    public void resetPassword(String token, String newPassword) {
        VerificationToken resetToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Token de resetare a parolei invalid"));

        AppUser user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        tokenRepository.delete(resetToken);
    }

    private void createVerificationToken(AppUser user, String token) {
        tokenRepository.deleteByUser(user);
        tokenRepository.flush();

        VerificationToken myToken = VerificationToken.builder()
                .token(token)
                .user(user)
                .expiryDate(LocalDateTime.now().plusHours(24))
                .build();

        tokenRepository.save(myToken);
    }

    @Override
    public UserDTO login(LoginDTO input) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(input.getEmail(), input.getPassword())
            );
        } catch (DisabledException e) {
            try {
                applicationContext.getBean(AuthService.class).resendVerificationToken(input.getEmail());
            } catch (Exception ex) {
                System.err.println("=== ERROR RESENDING VERIFICATION TOKEN ===");
                ex.printStackTrace();
            }
            throw new EmailNotVerifiedException("Te rugăm să îți verifici adresa de email înainte de a te autentifica.");
        }

        AppUser user = userRepository.findByEmail(input.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Date de autentificare invalide"));

        UserProfile profile = profileRepository.findByUserId(user.getId()).orElse(null);

        String jwtToken = jwtService.generateToken(user, user.getId());


        com.disertatie.univflow.models.RefreshToken refreshToken = refreshTokenService.createRefreshToken(user.getId());

        UserDTO responseDTO = UserMapper.toDTO(user, profile);


        responseDTO.setToken(jwtToken);

        responseDTO.setRefreshToken(refreshToken.getToken());

        return responseDTO;
    }

    @Override
    @Transactional
    public void resendVerificationToken(String email) {
        AppUser user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Utilizatorul nu a fost găsit"));

        if (user.isEnabled()) {
            throw new IllegalStateException("Acest cont este deja verificat și activ.");
        }

        String newToken = UUID.randomUUID().toString();
        createVerificationToken(user, newToken);

        emailService.sendVerificationEmail(user.getEmail(), newToken, getFrontendUrl());
    }

    public AuthResponse refreshToken(String requestRefreshToken) {
        return refreshTokenService.findByToken(requestRefreshToken)
                .map(refreshTokenService::verifyExpiration)
                .map(RefreshToken::getAppUser)
                .map(user -> {
                    
                    String token = jwtService.generateToken(user, user.getId());

                    return AuthResponse.builder()
                            .accessToken(token)
                            .refreshToken(requestRefreshToken) 
                            .build();
                })
                .orElseThrow(() -> new RuntimeException("Validarea refresh token-ului a eșuat sau token-ul nu a fost găsit"));
    }

    public void logout(String refreshTokenString) {
        refreshTokenService.deleteByTokenString(refreshTokenString);
    }

    @Transactional
    public void requestEmailChange(String currentEmail, String newEmail) {
        AppUser user = userRepository.findByEmail(currentEmail)
                .orElseThrow(() -> new RuntimeException("Utilizatorul nu a fost găsit"));

        if (userRepository.findByEmail(newEmail).isPresent()) {
            throw new IllegalArgumentException("Această adresă de email este deja înregistrată.");
        }

        
        user.setPendingEmail(newEmail);
        userRepository.save(user);

        
        String token = UUID.randomUUID().toString();
        createVerificationToken(user, token);

        
        emailService.sendEmailChangeVerification(newEmail, token, getFrontendUrl());
    }

    @Transactional
    public void confirmEmailChange(String token) {
        VerificationToken verificationToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Token invalid"));

        if (verificationToken.getExpiryDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Link-ul de verificare a expirat");
        }

        AppUser user = verificationToken.getUser();
        if (user.getPendingEmail() == null || user.getPendingEmail().isEmpty()) {
            throw new RuntimeException("Nu s-a găsit nicio solicitare în așteptare pentru schimbarea adresei de email.");
        }

        
        user.setEmail(user.getPendingEmail());
        user.setPendingEmail(null); 
        userRepository.save(user);

        tokenRepository.delete(verificationToken);
    }
}