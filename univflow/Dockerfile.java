# Stage 1: Builder
FROM eclipse-temurin:25-jdk-alpine AS builder
RUN apk add --no-cache openjdk21
WORKDIR /app
COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .
COPY src src
RUN chmod +x gradlew && JAVA_HOME=/usr/lib/jvm/java-21-openjdk ./gradlew bootJar --no-daemon

# Stage 2: Extractor
FROM bellsoft/liberica-runtime-container:jdk-25-cds-slim-glibc AS extractor
WORKDIR /app
COPY --from=builder /app/build/libs