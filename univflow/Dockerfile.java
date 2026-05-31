
FROM ghcr.io/graalvm/native-image-community:25 AS builder

ENV GRAALVM_HOME=$JAVA_HOME

RUN microdnf install -y java-21-openjdk-devel findutils which

WORKDIR /app
COPY . .

RUN chmod +x gradlew && \
    JAVA_21_HOME=$(dirname $(dirname $(readlink -f $(which java)))) && \
    JAVA_HOME=$JAVA_21_HOME ./gradlew nativeCompile \
        -Porg.gradle.java.installations.paths=$GRAALVM_HOME \
        --no-daemon

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=builder /app/build/native/nativeCompile/univflow /app/univflow
EXPOSE 8080
ENTRYPOINT ["./univflow"]