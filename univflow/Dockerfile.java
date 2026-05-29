# Stage 1: Build nativ folosind GraalVM 25
FROM ghcr.io/graalvm/native-image-community:25 AS builder

# Salvează calea către GraalVM 25 preinstalat
ENV GRAALVM_HOME=$JAVA_HOME

# Limitează memoria heap a compilatorului GraalVM la 5GB pentru a preveni crash-ul OOM (exit code 137)
ENV NATIVE_IMAGE_OPTIONS="-J-Xmx5g"

# Instalăm OpenJDK 21, findutils (pentru xargs) și which
RUN microdnf install -y java-21-openjdk-devel findutils which

WORKDIR /app
COPY . .

# Rulăm Gradle cu Java 21, dar îi indicăm să folosească GraalVM 25 pentru compilarea codului
RUN chmod +x gradlew && \
    JAVA_21_HOME=$(dirname $(dirname $(readlink -f $(which java)))) && \
    JAVA_HOME=$JAVA_21_HOME ./gradlew nativeCompile \
        -Porg.gradle.java.installations.paths=$GRAALVM_HOME \
        --no-daemon

# Stage 2: Runtime minim bazat pe Debian (glibc nativ)
FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/build/native/nativeCompile/univflow /app/univflow
EXPOSE 8080
ENTRYPOINT ["./univflow"]