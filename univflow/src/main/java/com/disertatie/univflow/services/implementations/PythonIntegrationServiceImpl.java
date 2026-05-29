package com.disertatie.univflow.services.implementations;

import com.disertatie.univflow.models.dto.IngestResponseDTO;
import com.disertatie.univflow.services.PythonIntegrationService;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;
import reactor.core.publisher.Mono;
import tools.jackson.databind.ObjectMapper;

import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpResponse;
import java.io.IOException;
import java.time.Duration;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class PythonIntegrationServiceImpl implements PythonIntegrationService {

    private final ObjectMapper objectMapper;
    private final RestTemplate cleanRestTemplate;
    private final RestTemplate streamingRestTemplate;
    private final Map<String, Boolean> stopSignals = new ConcurrentHashMap<>();

    @Value("${python.service.internal-key}")
    private String internalApiKey;

    @Value("${python.service.ingest-url:http://localhost:8000}")
    private String ingestServiceUrl;

    @Value("${python.service.ask-url:http://localhost:8001}")
    private String askServiceUrl;

    private final WebClient.Builder webClientBuilder;
    private WebClient webClient;

    public PythonIntegrationServiceImpl(ObjectMapper objectMapper, WebClient.Builder webClientBuilder) {
        this.objectMapper = objectMapper;
        this.webClientBuilder = webClientBuilder;
        this.cleanRestTemplate = new RestTemplate();
        this.streamingRestTemplate = new RestTemplate();
        
        this.cleanRestTemplate.setInterceptors(List.of(new ClientHttpRequestInterceptor() {
            @Override
            public ClientHttpResponse intercept(org.springframework.http.HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
                int maxRetries = 3;
                long backoffMs = 1500;
                IOException lastException = null;
                ClientHttpResponse response = null;
                
                for (int i = 0; i < maxRetries; i++) {
                    try {
                        response = execution.execute(request, body);
                        if (response.getStatusCode().is5xxServerError()) {
                            log.warn("Request to Python service at {} failed with status {}. Retrying {}/{}...", 
                                    request.getURI(), response.getStatusCode(), i + 1, maxRetries);
                            response.close();
                        } else {
                            return response;
                        }
                    } catch (IOException e) {
                        lastException = e;
                        log.warn("Request to Python service at {} failed with exception: {}. Retrying {}/{}...", 
                                request.getURI(), e.getMessage(), i + 1, maxRetries);
                    }
                    
                    if (i < maxRetries - 1) {
                        try {
                            Thread.sleep(backoffMs * (i + 1));
                        } catch (InterruptedException ex) {
                            Thread.currentThread().interrupt();
                            throw new IOException("Retry sleep interrupted", ex);
                        }
                    }
                }
                
                if (response != null) {
                    return response;
                }
                if (lastException != null) {
                    throw lastException;
                }
                throw new IOException("Request failed after " + maxRetries + " retries");
            }
        }));
    }

    @PostConstruct
    public void init() {
        reactor.netty.http.client.HttpClient httpClient = reactor.netty.http.client.HttpClient.create()
                .option(io.netty.channel.ChannelOption.CONNECT_TIMEOUT_MILLIS, 15000)
                .responseTimeout(Duration.ofSeconds(30));

        this.webClient = webClientBuilder
                .clientConnector(new org.springframework.http.client.reactive.ReactorClientHttpConnector(httpClient))
                .baseUrl(askServiceUrl)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();

        log.info("WebClient a fost configurat cu succes la adresa: {} cu timeout conexiune 15s și read 30s", askServiceUrl);
    }

    @Override
    public void triggerStop(String email, String courseId) {
        stopSignals.put(email + "|" + courseId, true);
    }

    @Override
    public ResponseEntity<StreamingResponseBody> askAiQuestionStream(String question, String courseId) {
        
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        String signalKey = email + "|" + courseId;
        stopSignals.put(signalKey, false);
        Map<String, String> payload = Map.of("question", question);

        StreamingResponseBody responseBody = outputStream -> {
            if (Boolean.TRUE.equals(stopSignals.get(signalKey))) return;
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                headers.set("X-Course-Id", courseId);
                headers.set("X-User-Id", email);
                headers.set("X-Internal-Service-Key", internalApiKey);

                streamingRestTemplate.execute(
                        askServiceUrl + "/api/ask/stream",
                        HttpMethod.POST,
                        request -> {
                            request.getHeaders().addAll(headers);
                            objectMapper.writeValue(request.getBody(), payload);
                        },
                        response -> {
                            if (response.getStatusCode().isError()) {
                                handleStreamError(response, outputStream);
                                return null;
                            }
                            try (InputStream is = response.getBody()) {
                                byte[] buffer = new byte[8192];
                                int bytesRead;
                                while ((bytesRead = is.read(buffer)) != -1) {
                                    if (Boolean.TRUE.equals(stopSignals.get(signalKey))) break;
                                    outputStream.write(buffer, 0, bytesRead);
                                    outputStream.flush();
                                }
                            } finally {
                                stopSignals.remove(signalKey);
                            }
                            return null;
                        }
                );
            } catch (Exception e) {
                log.error("Critical error in AI Stream: {}", e.getMessage());
            }
        };
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_EVENT_STREAM)
                .header("X-Accel-Buffering", "no")
                .header("Cache-Control", "no-cache")
                .body(responseBody);
    }

    
    @Override
    public IngestResponseDTO uploadDocumentToPython(String courseId, List<MultipartFile> files) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            headers.set("X-Internal-Service-Key", internalApiKey);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("course_id", courseId);

            for (MultipartFile file : files) {
                body.add("files", new ByteArrayResource(file.getBytes()) {
                    @Override
                    public String getFilename() { return file.getOriginalFilename(); }
                });
            }

            ResponseEntity<IngestResponseDTO> response = cleanRestTemplate.postForEntity(
                    ingestServiceUrl + "/api/ingest",
                    new HttpEntity<>(body, headers),
                    IngestResponseDTO.class
            );

            return response.getBody();

        } catch (Exception e) {
            log.error("Ingestion Service communication error", e);
            throw new RuntimeException("Serviciul de Ingestie Python este indisponibil.");
        }
    }

    @Override
    public Map<String, String> checkAllPythonHealth() {
        Map<String, String> healthStatus = new HashMap<>();
        healthStatus.put("ingest_service", checkServiceHealth(ingestServiceUrl));
        healthStatus.put("ask_service", checkServiceHealth(askServiceUrl));
        return healthStatus;
    }

    @Override
    public void deleteDocumentData(String jobId) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Internal-Service-Key", internalApiKey);
            cleanRestTemplate.exchange(
                    ingestServiceUrl + "/api/documents/" + jobId,
                    HttpMethod.DELETE,
                    new HttpEntity<>(headers),
                    String.class
            );
        } catch (Exception e) {
            log.error("Failed to sync document deletion with Python for job: {}", jobId, e);
            throw new RuntimeException("Nu s-a putut sincroniza ștergerea cu serviciile Python.");
        }
    }

    private String checkServiceHealth(String url) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Internal-Service-Key", internalApiKey);
            ResponseEntity<String> response = cleanRestTemplate.exchange(
                    url + "/health", HttpMethod.GET, new HttpEntity<>(headers), String.class
            );
            return response.getStatusCode().is2xxSuccessful() ? "UP" : "DOWN";
        } catch (Exception e) {
            return "DOWN (" + e.getMessage() + ")";
        }
    }

    private void handleStreamError(org.springframework.http.client.ClientHttpResponse response, java.io.OutputStream os) throws java.io.IOException {
        byte[] errorBytes = response.getBody().readAllBytes();
        String errorMsg = new String(errorBytes, StandardCharsets.UTF_8);
        os.write(("event: error\ndata: " + errorMsg + "\n\n").getBytes());
        os.flush();
    }

    @Override
    public void deleteEntireCourseData(String courseId) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Internal-Service-Key", internalApiKey);

            cleanRestTemplate.exchange(
                    ingestServiceUrl + "/api/courses/" + courseId,
                    HttpMethod.DELETE,
                    new HttpEntity<>(headers),
                    String.class
            );
            log.info("Purge request sent to Python for course: {}", courseId);
        } catch (Exception e) {
            log.error("Failed to sync course deletion with Python: {}", e.getMessage());
            throw new RuntimeException("Nu s-a putut sincroniza ștergerea datelor cu Motorul AI.");
        }
    }

    @Override
    public Mono<String> getPaginatedChatHistory(String courseId, String userId, int page, int size) {
        return this.webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/api/ask/history/{courseId}")
                        .queryParam("page", page)
                        .queryParam("size", size)
                        .build(courseId))
                .header("X-User-Id", userId)
                .header("X-Internal-Service-Key", internalApiKey)
                .retrieve()
                .bodyToMono(String.class)
                .doOnError(throwable -> log.warn("Apelul către istoric chat askService a eșuat: {}. Se încearcă retry...", throwable.getMessage()))
                .retryWhen(reactor.util.retry.Retry.backoff(3, Duration.ofSeconds(2))
                        .filter(throwable -> {
                            if (throwable instanceof org.springframework.web.reactive.function.client.WebClientResponseException ex) {
                                int status = ex.getStatusCode().value();
                                return status == 404 || status == 408 || status == 409 || status >= 500;
                            }
                            return true;
                        })
                        .doBeforeRetry(retrySignal -> log.warn("Tentativă de retry #{} pentru istoric chat din cauza: {}", 
                                retrySignal.totalRetries() + 1, retrySignal.failure().getMessage())));
    }

    @Override
    public String generateQuiz(String courseId, String topic, String difficulty, int numQuestions, int optionsPerQuestion, boolean allowMultipleCorrect, String userEmail) {
        String url = askServiceUrl + "/api/quiz/" + courseId + "/generate";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("X-User-Id", userEmail);
        headers.set("X-Internal-Service-Key", internalApiKey);

        Map<String, Object> requestBody = Map.of(
                "topic", topic,
                "difficulty", difficulty,
                "num_questions", numQuestions,
                "options_per_question", optionsPerQuestion,
                "allow_multiple_correct", allowMultipleCorrect
        );

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        ResponseEntity<String> response = cleanRestTemplate.exchange(
                url, HttpMethod.POST, entity, String.class
        );

        return response.getBody();
    }

    @Override
    public Map<String, Object> getIngestionJobStatus(String jobId) {
        
        String url = ingestServiceUrl + "/api/status/" + jobId;

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-Internal-Service-Key", internalApiKey);

        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<Map> response = cleanRestTemplate.exchange(
                url, HttpMethod.GET, entity, Map.class
        );

        return response.getBody();
    }
}