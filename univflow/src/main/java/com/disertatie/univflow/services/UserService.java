package com.disertatie.univflow.services;

import com.disertatie.univflow.models.dto.UserDTO;


public interface UserService {
    UserDTO getCurrentUserProfile(String email);
    UserDTO updateUser(String email, UserDTO dto);
    void deleteUser(String email);

    void changePassword(String email, String oldPassword, String newPassword);
}