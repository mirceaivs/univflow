package com.disertatie.univflow.models.dto.mapper;


import com.disertatie.univflow.models.AppUser;
import com.disertatie.univflow.models.UserProfile;
import com.disertatie.univflow.models.dto.UserDTO;

public class UserMapper {

    public static UserDTO toDTO(AppUser user, UserProfile profile) {
        return UserDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(profile != null ? profile.getFirstName() : null)
                .lastName(profile != null ? profile.getLastName() : null)
                .avatarUrl(profile != null ? profile.getAvatarUrl() : null) 
                .build();
    }
}