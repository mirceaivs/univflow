package com.disertatie.univflow.utils.config;

import com.disertatie.univflow.repositories.AppUserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AuthConfig {

    private final AppUserRepository userRepository;

    @Autowired
    public AuthConfig(AppUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Bean
    public UserDetailsService userDetailsService(AppUserRepository userRepository) {
        return identifier -> {
            try {
                Long id = Long.parseLong(identifier);
                return userRepository.findById(id)
                        .orElseThrow(() -> new UsernameNotFoundException("Utilizatorul nu a fost găsit cu id-ul: " + identifier));
            } catch (NumberFormatException e) {
                return userRepository.findByEmail(identifier)
                        .orElseThrow(() -> new UsernameNotFoundException("Utilizatorul nu a fost găsit cu email-ul: " + identifier));
            }
        };
    }
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public AuthenticationProvider authenticationProvider(
            UserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder) {

        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(userDetailsService);

        authProvider.setPasswordEncoder(passwordEncoder);

        return authProvider;
    }
}