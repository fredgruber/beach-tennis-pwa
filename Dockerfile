# =========================================================
# Arena Beach Tennis - Dockerfile (Multi-stage para Render)
# =========================================================

# Estágio de compilação
FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /app
COPY . .
RUN chmod +x gradlew
RUN ./gradlew build -x test --no-daemon

# Estágio de execução
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Copia o jar compilado
COPY --from=build /app/build/libs/beach-tennis-pwa-0.0.1-SNAPSHOT.jar beachtennispwa.jar

ARG JAVA_OPTS
ENV JAVA_OPTS=$JAVA_OPTS

# Cria diretório de dados para persistência local
RUN mkdir -p /app/data && chmod 777 /app/data
VOLUME /app/data

EXPOSE 8080

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -Djava.security.egd=file:/dev/./urandom -jar beachtennispwa.jar"]
