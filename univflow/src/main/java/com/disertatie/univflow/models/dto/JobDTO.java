package com.disertatie.univflow.models.dto;

import lombok.Data;
import com.fasterxml.jackson.annotation.JsonProperty;


@Data
public class JobDTO {
    @JsonProperty("job_id")
    private String jobId;

    @JsonProperty("filename")
    private String fileName;
}