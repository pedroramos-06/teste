# syntax=docker/dockerfile:1

# =============================================================================
# IFast backend - variant for the 2 GB VPS (InterServer 1 slice)
#
# RAM budget on the host (2 GB): Dokploy ~0.4 GB + MySQL (buffer pool ~256 MB)
# + this container + OS. Set the Dokploy memory limit of this app to 768m.
#
# JAVA_OPTS can be overridden from the Dokploy environment without rebuilding.
#
# Dokploy builds this image on the VPS itself (no CI image). The Maven build
# heap is capped below so a build cannot starve MySQL and the running JVM.
# =============================================================================

# ---------- build stage ----------
FROM eclipse-temurin:17-jdk AS build
WORKDIR /app

# Cap the Maven JVM heap: the build shares 2 GB with Dokploy, MySQL and the
# live app. If the build ever fails with OutOfMemoryError, raise this a little.
ENV MAVEN_OPTS="-Xmx512m"

# Resolve dependencies first so this layer is cached until pom.xml changes.
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw -B -q dependency:go-offline

COPY src/ src/
# Tests are skipped here (none exist yet). If a CI test job is added later, it runs outside this build.
RUN ./mvnw -B -q package -DskipTests

# ---------- runtime stage ----------
FROM eclipse-temurin:17-jre

# Time zone: the app uses LocalDateTime everywhere, so the server clock decides
# what "now" and the Period filter mean. Brazil has no DST, but use the zone id.
ENV TZ=America/Sao_Paulo

# curl is only for the HEALTHCHECK below. Non-root user for the app.
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl tzdata \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system app \
    && useradd --system --gid app --no-create-home app

WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
USER app

EXPOSE 8080

# Heap 384 MB + metaspace/code cache/threads/native => ~600-700 MB RSS.
# SerialGC: smallest footprint, fine for 1 vCPU and a few dozen concurrent users.
# ExitOnOutOfMemoryError: crash and let Dokploy restart instead of a zombie JVM.
ENV JAVA_OPTS="-Xms128m -Xmx384m \
 -XX:MaxMetaspaceSize=128m -XX:ReservedCodeCacheSize=64m -Xss512k \
 -XX:+UseSerialGC -XX:+ExitOnOutOfMemoryError \
 -Duser.timezone=America/Sao_Paulo \
 -Djava.security.egd=file:/dev/./urandom"

# Needs Actuator with only "health" exposed AND that path permitted without a JWT
# in SecurityConfig. Until then the container reports "unhealthy".
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
    CMD curl -fsS http://localhost:8080/actuator/health || exit 1

# Shell form via sh -c so $JAVA_OPTS is expanded; exec keeps the JVM as PID 1
# so it receives SIGTERM on redeploys.
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
