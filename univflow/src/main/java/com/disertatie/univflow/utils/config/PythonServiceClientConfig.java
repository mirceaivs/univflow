package com.disertatie.univflow.utils.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.client.RestClient;
import org.springframework.web.reactive.function.client.WebClient; 

import java.io.IOException;

@Configuration
public class PythonServiceClientConfig {

    @Value("${python.service.base-url:http://localhost:8000}")
    private String pythonServiceBaseUrl;

    @Value("${python.service.internal-key:my-super-secret-key-123}")
    private String internalServiceKey;

    @Bean
    public RestClient pythonRestClient() {
        return RestClient.builder()
                .baseUrl(pythonServiceBaseUrl)
                .requestInterceptor(new SecurityPropagationInterceptor(internalServiceKey))
                .build();
    }

    @Bean
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder();
    }

    private static class SecurityPropagationInterceptor implements ClientHttpRequestInterceptor {
        private final String internalKey;

        public SecurityPropagationInterceptor(String internalKey) {
            this.internalKey = internalKey;
        }

        @Override
        public ClientHttpResponse intercept(HttpRequest request, byte[] body, ClientHttpRequestExecution execution) throws IOException {
            request.getHeaders().add("X-Internal-Service-Key", internalKey);

            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equals(authentication.getName())) {
                request.getHeaders().add("X-User-Id", authentication.getName());
            }

            return execution.execute(request, body);
        }
    }
}