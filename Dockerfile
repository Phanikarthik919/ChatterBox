# ========================================
# Stage 1: Build
# ========================================
FROM maven:3.9-eclipse-temurin-11 AS build

WORKDIR /app

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Build the application
COPY src ./src
RUN mvn clean package -DskipTests -B

# ========================================
# Stage 2: Run
# ========================================
FROM eclipse-temurin:11-jre

WORKDIR /app

# Create non-root user
RUN groupadd -r chatterbox && useradd -r -g chatterbox chatterbox

# Create directories
RUN mkdir -p /app/uploads /app/data && chown -R chatterbox:chatterbox /app

# Copy the built JAR
COPY --from=build /app/target/*.jar app.jar

# Switch to non-root user
USER chatterbox

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# JVM optimizations for containers
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
