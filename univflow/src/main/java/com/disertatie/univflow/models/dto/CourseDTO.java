package com.disertatie.univflow.models.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CourseDTO {
    private String id;

    @NotBlank(message = "Numele cursului este obligatoriu")
    private String name;

    @NotNull(message = "Anul de studiu este obligatoriu")
    private Integer studyYear;

    @NotNull(message = "Semestrul este obligatoriu")
    private Integer semester;

    private String description;
    private Integer progress;
    private Long documentsCount;
    private LocalDateTime lastAccessed;

    
    public CourseDTO(String id, String name, Integer studyYear, Integer semester, String description, Integer progress) {
        this.id = id;
        this.name = name;
        this.studyYear = studyYear;
        this.semester = semester;
        this.description = description;
        this.progress = progress;
    }
}