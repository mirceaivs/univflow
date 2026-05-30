package com.disertatie.univflow.services;

import com.disertatie.univflow.models.Document;
import com.disertatie.univflow.models.dto.DocumentDTO;
import java.util.List;

public interface DocumentService {
    
    List<DocumentDTO> getDocumentsByCourse(String courseId);

    Document getById(String documentId);
    void saveAll(List<Document> documents);
    void deleteDocument(String documentId, String userEmail);
    String getPreviewUrl(String documentId, String userEmail);
}