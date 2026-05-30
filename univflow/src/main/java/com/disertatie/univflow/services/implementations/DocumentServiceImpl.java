package com.disertatie.univflow.services.implementations;

import com.disertatie.univflow.models.Document;
import com.disertatie.univflow.models.dto.DocumentDTO;
import com.disertatie.univflow.repositories.DocumentRepository;
import com.disertatie.univflow.services.DocumentService;
import com.disertatie.univflow.services.PythonIntegrationService;
import jakarta.persistence.EntityNotFoundException;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentServiceImpl implements DocumentService {

    private final DocumentRepository documentRepository;
    private final PythonIntegrationService pythonService;

    @org.springframework.beans.factory.annotation.Value("${gcs.bucket.name:test-bucket-mivascu}")
    private String gcsBucketName;

    @Override
    public List<DocumentDTO> getDocumentsByCourse(String courseId) {
        
        return documentRepository.findAllByCourseId(courseId).stream()
                .map(doc -> DocumentDTO.builder()
                        .id(doc.getId())
                        .fileName(doc.getFileName())
                        .jobId(doc.getJobId())
                        .fileType(doc.getFileType())
                        .uploadDate(doc.getUploadDate())
                        .url(String.format("https://storage.googleapis.com/%s/ingestion_artifacts/%s/%s_%s", gcsBucketName, courseId, doc.getJobId(), doc.getFileName()))
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public Document getById(String documentId) {
        return documentRepository.findById(documentId)
                .orElseThrow(() -> new EntityNotFoundException("Documentul nu a fost găsit cu ID-ul: " + documentId));
    }

    @Override
    @Transactional
    public void saveAll(List<Document> documents) {
        documentRepository.saveAll(documents);
    }

    @Override
    @Transactional
    public void deleteDocument(String documentId, String userEmail) {
        Document document = getById(documentId);

        
        if (!document.getCourse().getOwner().getEmail().equals(userEmail)) {
            throw new RuntimeException("Acces interzis. Nu sunteți proprietarul acestui document.");
        }

        try {
            pythonService.deleteDocumentData(document.getJobId());
            documentRepository.delete(document);
            log.info("Document {} deleted by {}", documentId, userEmail);
        } catch (Exception e) {
            log.error("Failed to delete document {}: {}", documentId, e.getMessage());
            throw new RuntimeException("Eroare de sincronizare.");
        }
    }

    @Override
    public String getPreviewUrl(String documentId, String userEmail) {
        Document document = getById(documentId);

        if (!document.getCourse().getOwner().getEmail().equals(userEmail)) {
            throw new RuntimeException("Acces interzis. Nu aveți permisiunea de a vizualiza acest document.");
        }

        return pythonService.getSignedUrl(document.getJobId());
    }
}