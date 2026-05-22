package com.disertatie.univflow.models.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.*;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserDTO {
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String avatarUrl;

    @JsonIgnore
    private String token;
    @JsonIgnore
    private String refreshToken;
}