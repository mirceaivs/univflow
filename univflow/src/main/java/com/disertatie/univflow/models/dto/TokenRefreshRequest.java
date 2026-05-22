package com.disertatie.univflow.models.dto;

import lombok.Data;

@Data
public class TokenRefreshRequest {
    private String refreshToken;
}