package com.disertatie.univflow.services;


import com.disertatie.univflow.models.dto.AuthResponse;
import com.disertatie.univflow.models.dto.LoginDTO;
import com.disertatie.univflow.models.dto.RegisterDTO;
import com.disertatie.univflow.models.dto.UserDTO;

public interface AuthService {
    UserDTO register(RegisterDTO input);
    UserDTO login(LoginDTO input);
    void verifyUser(String token);
    void forgotPassword(String email);
    void resetPassword(String token, String newPassword);
    void resendVerificationToken(String email);
    void requestEmailChange(String currentEmail, String newEmail);
    void confirmEmailChange(String token);
    AuthResponse refreshToken(String requestRefreshToken);
    void logout(String refreshTokenString);
}