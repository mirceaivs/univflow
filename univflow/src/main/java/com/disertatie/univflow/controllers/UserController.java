package com.disertatie.univflow.controllers;

import com.disertatie.univflow.models.dto.ChangePasswordDTO;
import com.disertatie.univflow.models.dto.UserDTO;
import com.disertatie.univflow.services.AuthService;
import com.disertatie.univflow.services.UserService;
import com.disertatie.univflow.utils.idempotency.Idempotent;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/users")
public class UserController {

    private final UserService userService;
    private final AuthService authService; 

    @Autowired
    public UserController(UserService userService, AuthService authService) {
        this.userService = userService;
        this.authService = authService; 
    }

    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(userService.getCurrentUserProfile(userDetails.getUsername()));
    }

    @Idempotent(seconds = 5)
    @PutMapping("/me")
    public ResponseEntity<UserDTO> updateCurrentUser(@AuthenticationPrincipal UserDetails userDetails,
                                                     @RequestBody UserDTO dto) {

        
        UserDTO updatedUser = userService.updateUser(userDetails.getUsername(), dto);

        
        if (dto.getEmail() != null && !dto.getEmail().trim().isEmpty() && !dto.getEmail().equals(userDetails.getUsername())) {
            authService.requestEmailChange(userDetails.getUsername(), dto.getEmail());
            
        }

        return ResponseEntity.ok(updatedUser);
    }

    @Idempotent(seconds = 10)
    @DeleteMapping("/me")
    public ResponseEntity<Void> deleteCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        userService.deleteUser(userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @Idempotent(seconds = 5)
    @PutMapping("/me/password")
    public ResponseEntity<Map<String, String>> updatePassword(@AuthenticationPrincipal UserDetails userDetails,
                                                              @Valid @RequestBody ChangePasswordDTO dto) {
        userService.changePassword(userDetails.getUsername(), dto.getOldPassword(), dto.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }
}