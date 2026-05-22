package com.disertatie.univflow.utils.idempotency;

import com.disertatie.univflow.errors.ConcurrentRequestException;
import com.disertatie.univflow.models.IdempotencyRecord;
import com.disertatie.univflow.repositories.IdempotencyRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.Optional;

@Aspect
@Component
public class IdempotencyAspect {

    private final IdempotencyRepository repository;
    private final ObjectMapper objectMapper;

    public IdempotencyAspect(IdempotencyRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    @Around("@annotation(idempotentConfig)")
    public Object execute(ProceedingJoinPoint joinPoint, Idempotent idempotentConfig) throws Throwable {
        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();

        String principal = SecurityContextHolder.getContext().getAuthentication().getName();
        String payload = (request instanceof CachedBodyHttpServletRequest req)
                ? new String(req.getCachedBody(), StandardCharsets.UTF_8) : "";

        String hash = generateHash(principal, request.getMethod(), request.getRequestURI(), payload);

        Optional<IdempotencyRecord> existingRecord = repository.findById(hash);

        if (existingRecord.isPresent()) {
            IdempotencyRecord record = existingRecord.get();

            if (record.getExpiresAt().isBefore(LocalDateTime.now(ZoneOffset.UTC))) {
                repository.delete(record);
                repository.flush();
            } else {
                if (record.getState() == IdempotencyRecord.ProcessState.IN_PROGRESS) {
                    throw new ConcurrentRequestException("Cererea este deja în curs de procesare. Vă rugăm să așteptați un moment.");
                }

                if (record.getState() == IdempotencyRecord.ProcessState.COMPLETED) {
                    MethodSignature methodSignature = (MethodSignature) joinPoint.getSignature();
                    return handleCachedResponse(record, methodSignature);
                }
            }
        }

        IdempotencyRecord newRecord = IdempotencyRecord.builder()
                .requestHash(hash)
                .principalSubject(principal)
                .state(IdempotencyRecord.ProcessState.IN_PROGRESS)
                .createdAt(LocalDateTime.now(ZoneOffset.UTC))
                .expiresAt(LocalDateTime.now(ZoneOffset.UTC).plusSeconds(idempotentConfig.seconds()))
                .build();

        repository.saveAndFlush(newRecord);

        try {
            Object result = joinPoint.proceed();
            Object bodyToSave = (result instanceof ResponseEntity<?> re) ? re.getBody() : result;
            updateStatus(hash, IdempotencyRecord.ProcessState.COMPLETED, objectMapper.writeValueAsString(bodyToSave));
            return result;
        } catch (Throwable ex) {
            repository.deleteById(hash);
            throw ex;
        }
    }

    private void updateStatus(String hash, IdempotencyRecord.ProcessState state, String response) {
        repository.findById(hash).ifPresent(r -> {
            r.setState(state);
            r.setResponsePayload(response);
            repository.saveAndFlush(r);
        });
    }

    private Object handleCachedResponse(IdempotencyRecord record, MethodSignature signature) throws Exception {
        Class<?> returnType = signature.getReturnType();

        if (ResponseEntity.class.isAssignableFrom(returnType)) {
            java.lang.reflect.Type genericReturnType = signature.getMethod().getGenericReturnType();

            if (genericReturnType instanceof java.lang.reflect.ParameterizedType pt) {
                java.lang.reflect.Type actualType = pt.getActualTypeArguments()[0];

                Object body = objectMapper.readValue(
                        record.getResponsePayload(),
                        objectMapper.constructType(actualType)
                );

                return ResponseEntity.ok(body);
            }
        }

        return objectMapper.readValue(record.getResponsePayload(), returnType);
    }

    private String generateHash(String p, String m, String u, String body) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        String key = String.format("%s|%s|%s|%s", p, m, u, body);
        return HexFormat.of().formatHex(md.digest(key.getBytes(StandardCharsets.UTF_8)));
    }
}