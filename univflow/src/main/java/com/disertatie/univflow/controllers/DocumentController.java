package com.disertatie.univflow.controllers;

import com.disertatie.univflow.services.DocumentService;
import com.disertatie.univflow.utils.idempotency.Idempotent;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/documents")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @GetMapping("/{id}/preview")
    public ResponseEntity<Map<String, String>> getPreviewUrl(@PathVariable String id) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        String signedUrl = documentService.getPreviewUrl(id, email);
        return ResponseEntity.ok(Map.of("url", signedUrl));
    }

    @DeleteMapping("/{id}")
    @Idempotent(seconds = 10)
    public ResponseEntity<Void> deleteDocument(@PathVariable String id) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        documentService.deleteDocument(id, email);
        return ResponseEntity.noContent().build();
    }
}