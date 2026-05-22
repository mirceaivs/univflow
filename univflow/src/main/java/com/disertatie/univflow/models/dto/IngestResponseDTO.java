package com.disertatie.univflow.models.dto;

import lombok.Data;

import java.util.List;

@Data
public class IngestResponseDTO {
    private String message;
    private List<JobDTO> jobs;
}