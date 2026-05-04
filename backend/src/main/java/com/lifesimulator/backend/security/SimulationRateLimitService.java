package com.lifesimulator.backend.security;

import com.lifesimulator.backend.config.SimulatorProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class SimulationRateLimitService {

  private static final int CLEANUP_INTERVAL = 1024;

  private final Clock clock;
  private final AtomicInteger checkCount = new AtomicInteger();
  private final ConcurrentMap<String, Bucket> buckets = new ConcurrentHashMap<>();
  private final SimulatorProperties properties;

  @Autowired
  public SimulationRateLimitService(SimulatorProperties properties) {
    this(properties, Clock.systemUTC());
  }

  SimulationRateLimitService(SimulatorProperties properties, Clock clock) {
    this.clock = clock;
    this.properties = properties;
  }

  public RateLimitDecision check(String clientIp, String sessionId) {
    SimulatorProperties.RateLimit rateLimit = properties.getSecurity().getRateLimit();
    if (!rateLimit.isEnabled()) {
      return RateLimitDecision.permit();
    }

    if (checkCount.incrementAndGet() % CLEANUP_INTERVAL == 0) {
      cleanupExpired();
    }

    List<BucketCheck> checks = new ArrayList<>();
    String normalizedIp = normalize(clientIp, "unknown");
    checks.add(
      checkBucket(
        "ip_minute:" + normalizedIp,
        "ip_minute",
        rateLimit.getIpMinuteLimit(),
        rateLimit.getMinuteWindow()
      )
    );
    checks.add(
      checkBucket(
        "ip_hour:" + normalizedIp,
        "ip_hour",
        rateLimit.getIpHourLimit(),
        rateLimit.getHourWindow()
      )
    );

    String normalizedSessionId = normalize(sessionId, "");
    if (!normalizedSessionId.isBlank()) {
      checks.add(
        checkBucket(
          "session_hour:" + normalizedSessionId,
          "session_hour",
          rateLimit.getSessionHourLimit(),
          rateLimit.getHourWindow()
        )
      );
    }

    return checks
      .stream()
      .filter(check -> !check.allowed())
      .findFirst()
      .map(check -> RateLimitDecision.rejected(check.scope(), check.resetAt()))
      .orElseGet(RateLimitDecision::permit);
  }

  private BucketCheck checkBucket(String key, String scope, int configuredLimit, Duration window) {
    Instant now = Instant.now(clock);
    int limit = Math.max(1, configuredLimit);
    Duration normalizedWindow = window == null || window.isZero() || window.isNegative()
      ? Duration.ofMinutes(1)
      : window;

    Bucket bucket = buckets.compute(key, (ignored, current) -> {
      if (current == null || !current.resetAt().isAfter(now)) {
        return new Bucket(1, now.plus(normalizedWindow));
      }
      return new Bucket(current.count() + 1, current.resetAt());
    });

    return new BucketCheck(scope, bucket.count() <= limit, bucket.resetAt());
  }

  private void cleanupExpired() {
    Instant now = Instant.now(clock);
    buckets.entrySet().removeIf(entry -> !entry.getValue().resetAt().isAfter(now));
  }

  private String normalize(String value, String fallback) {
    if (value == null || value.isBlank()) {
      return fallback;
    }
    return value.trim();
  }

  private record Bucket(int count, Instant resetAt) {}

  private record BucketCheck(String scope, boolean allowed, Instant resetAt) {}

  public record RateLimitDecision(boolean allowed, String rejectedScope, Instant resetAt) {
    public static RateLimitDecision permit() {
      return new RateLimitDecision(true, null, null);
    }

    public static RateLimitDecision rejected(String rejectedScope, Instant resetAt) {
      return new RateLimitDecision(false, rejectedScope, resetAt);
    }

    public long retryAfterSeconds(Clock clock) {
      if (resetAt == null) {
        return 0;
      }
      return Math.max(1, Duration.between(Instant.now(clock), resetAt).toSeconds());
    }
  }
}
