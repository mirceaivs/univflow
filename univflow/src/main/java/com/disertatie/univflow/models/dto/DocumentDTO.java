package com.disertatie.univflow.models.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentDTO {
    private String id;
    private String fileName;
    private String jobId;
    private String fileType;
    private LocalDateTime uploadDate;
    private String url;
}