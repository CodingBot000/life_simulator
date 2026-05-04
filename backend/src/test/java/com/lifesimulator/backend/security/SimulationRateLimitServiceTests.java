package com.lifesimulator.backend.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.lifesimulator.backend.config.SimulatorProperties;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class SimulationRateLimitServiceTests {

  private final Clock clock = Clock.fixed(Instant.parse("2026-05-04T00:00:00Z"), ZoneOffset.UTC);

  @Test
  void rejectsWhenIpMinuteBucketIsExhausted() {
    SimulatorProperties properties = new SimulatorProperties();
    properties.getSecurity().getRateLimit().setIpMinuteLimit(1);
    properties.getSecurity().getRateLimit().setIpHourLimit(100);
    properties.getSecurity().getRateLimit().setSessionHourLimit(100);
    SimulationRateLimitService service = new SimulationRateLimitService(properties, clock);

    assertThat(service.check("203.0.113.10", "session-a").allowed()).isTrue();

    SimulationRateLimitService.RateLimitDecision rejected = service.check(
      "203.0.113.10",
      "session-a"
    );

    assertThat(rejected.allowed()).isFalse();
    assertThat(rejected.rejectedScope()).isEqualTo("ip_minute");
  }

  @Test
  void rejectsWhenSessionHourBucketIsExhausted() {
    SimulatorProperties properties = new SimulatorProperties();
    properties.getSecurity().getRateLimit().setIpMinuteLimit(100);
    properties.getSecurity().getRateLimit().setIpHourLimit(100);
    properties.getSecurity().getRateLimit().setSessionHourLimit(1);
    SimulationRateLimitService service = new SimulationRateLimitService(properties, clock);

    assertThat(service.check("203.0.113.10", "session-a").allowed()).isTrue();

    SimulationRateLimitService.RateLimitDecision rejected = service.check(
      "203.0.113.11",
      "session-a"
    );

    assertThat(rejected.allowed()).isFalse();
    assertThat(rejected.rejectedScope()).isEqualTo("session_hour");
  }

  @Test
  void allowsRequestsWhenRateLimitingIsDisabled() {
    SimulatorProperties properties = new SimulatorProperties();
    properties.getSecurity().getRateLimit().setEnabled(false);
    properties.getSecurity().getRateLimit().setIpMinuteLimit(1);
    SimulationRateLimitService service = new SimulationRateLimitService(properties, clock);

    assertThat(service.check("203.0.113.10", "session-a").allowed()).isTrue();
    assertThat(service.check("203.0.113.10", "session-a").allowed()).isTrue();
  }
}
