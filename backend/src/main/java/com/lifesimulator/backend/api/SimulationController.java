package com.lifesimulator.backend.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifesimulator.backend.config.SimulatorProperties;
import com.lifesimulator.backend.logging.SimulationLogService;
import com.lifesimulator.backend.security.SimulationRateLimitService;
import com.lifesimulator.backend.security.SimulationRateLimitService.RateLimitDecision;
import com.lifesimulator.backend.simulation.SimulationProgressWriter;
import com.lifesimulator.backend.simulation.SimulationRunResult;
import com.lifesimulator.backend.simulation.SimulationService;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
public class SimulationController {

  private final ObjectMapper objectMapper;
  private final SimulatorProperties properties;
  private final SimulationRateLimitService rateLimitService;
  private final SimulationLogService simulationLogService;
  private final SimulationService simulationService;

  public SimulationController(
    ObjectMapper objectMapper,
    SimulatorProperties properties,
    SimulationRateLimitService rateLimitService,
    SimulationLogService simulationLogService,
    SimulationService simulationService
  ) {
    this.objectMapper = objectMapper;
    this.properties = properties;
    this.rateLimitService = rateLimitService;
    this.simulationLogService = simulationLogService;
    this.simulationService = simulationService;
  }

  @PostMapping("/api/simulate")
  public ResponseEntity<JsonNode> simulate(
    @RequestBody JsonNode body,
    @RequestHeader HttpHeaders headers,
    HttpServletRequest request
  ) throws IOException {
    String traceId = firstHeader(headers, "x-trace-id", UUID.randomUUID().toString());
    String locale = firstHeader(headers, "x-ui-locale", "ko");
    RateLimitDecision rateLimit = rateLimit(headers, request);
    if (!rateLimit.allowed()) {
      return rateLimitJsonResponse(rateLimit, traceId);
    }

    SimulationRunResult result = simulationService.run(body, traceId, locale, null);
    JsonNode response = result.response();
    simulationLogService.persistBestEffort(result.envelope());
    return ResponseEntity
      .ok()
      .header("x-request-id", response.get("request_id").asText())
      .header("x-trace-id", traceId)
      .header("x-llm-model", simulationService.model())
      .header("x-llm-execution-mode", response.at("/routing/execution_mode").asText("full"))
      .header("x-llm-selected-path", String.join(",", selectedPath(response)))
      .contentType(MediaType.APPLICATION_JSON)
      .body(response);
  }

  @PostMapping(value = "/api/simulate", headers = "x-simulate-stream=ndjson")
  public ResponseEntity<StreamingResponseBody> simulateStream(
    @RequestBody JsonNode body,
    @RequestHeader HttpHeaders headers,
    HttpServletRequest request
  ) {
    String traceId = firstHeader(headers, "x-trace-id", UUID.randomUUID().toString());
    String locale = firstHeader(headers, "x-ui-locale", "ko");
    RateLimitDecision rateLimit = rateLimit(headers, request);
    if (!rateLimit.allowed()) {
      return rateLimitStreamResponse(rateLimit, traceId);
    }

    StreamingResponseBody stream = output -> {
      SimulationProgressWriter progress = new SimulationProgressWriter(objectMapper, output);
      try {
        SimulationRunResult result = simulationService.run(body, traceId, locale, progress);
        JsonNode response = result.response();
        simulationLogService.persistBestEffort(result.envelope());
        progress.write(Map.of("type", "result", "request_id", response.get("request_id").asText(), "response", response));
      } catch (Exception error) {
        progress.write(
          Map.of(
            "type",
            "error",
            "trace_id",
            traceId,
            "error",
            message(error),
            "error_code",
            "backend_simulation_failed"
          )
        );
      }
    };

    return ResponseEntity
      .ok()
      .header("x-trace-id", traceId)
      .contentType(MediaType.parseMediaType("application/x-ndjson; charset=utf-8"))
      .body(stream);
  }

  private String firstHeader(HttpHeaders headers, String name, String fallback) {
    String value = headers.getFirst(name);
    return value == null || value.isBlank() ? fallback : value.trim();
  }

  private String message(Exception error) {
    String message = error.getMessage();
    return message == null || message.isBlank() ? error.getClass().getSimpleName() : message;
  }

  private RateLimitDecision rateLimit(HttpHeaders headers, HttpServletRequest request) {
    return rateLimitService.check(clientIp(request), firstHeader(headers, "x-session-id", ""));
  }

  private ResponseEntity<JsonNode> rateLimitJsonResponse(
    RateLimitDecision rateLimit,
    String traceId
  ) {
    ObjectNode body = objectMapper.createObjectNode();
    body.put("error", "Too many simulation requests. Please retry later.");
    body.put("error_code", "simulate_rate_limited");
    body.put("rate_limit_scope", rateLimit.rejectedScope());
    body.put("trace_id", traceId);

    return ResponseEntity
      .status(HttpStatus.TOO_MANY_REQUESTS)
      .header(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfterSeconds(rateLimit)))
      .header("x-rate-limit-scope", rateLimit.rejectedScope())
      .header("x-trace-id", traceId)
      .contentType(MediaType.APPLICATION_JSON)
      .body(body);
  }

  private ResponseEntity<StreamingResponseBody> rateLimitStreamResponse(
    RateLimitDecision rateLimit,
    String traceId
  ) {
    StreamingResponseBody stream = output -> {
      SimulationProgressWriter progress = new SimulationProgressWriter(objectMapper, output);
      progress.write(
        Map.of(
          "type",
          "error",
          "trace_id",
          traceId,
          "error",
          "Too many simulation requests. Please retry later.",
          "error_code",
          "simulate_rate_limited",
          "rate_limit_scope",
          rateLimit.rejectedScope()
        )
      );
    };

    return ResponseEntity
      .status(HttpStatus.TOO_MANY_REQUESTS)
      .header(HttpHeaders.RETRY_AFTER, String.valueOf(retryAfterSeconds(rateLimit)))
      .header("x-rate-limit-scope", rateLimit.rejectedScope())
      .header("x-trace-id", traceId)
      .contentType(MediaType.parseMediaType("application/x-ndjson; charset=utf-8"))
      .body(stream);
  }

  private long retryAfterSeconds(RateLimitDecision rateLimit) {
    Instant resetAt = rateLimit.resetAt();
    if (resetAt == null) {
      return 1;
    }
    return Math.max(1, Duration.between(Instant.now(), resetAt).toSeconds());
  }

  private String clientIp(HttpServletRequest request) {
    if (properties.getSecurity().getRateLimit().isUseForwardedHeaders()) {
      String forwardedFor = request.getHeader("x-forwarded-for");
      if (forwardedFor != null && !forwardedFor.isBlank()) {
        return forwardedFor.split(",")[0].trim();
      }
      String realIp = request.getHeader("x-real-ip");
      if (realIp != null && !realIp.isBlank()) {
        return realIp.trim();
      }
    }
    String remoteAddr = request.getRemoteAddr();
    return remoteAddr == null || remoteAddr.isBlank() ? "unknown" : remoteAddr;
  }

  private List<String> selectedPath(JsonNode response) {
    JsonNode path = response.at("/routing/selected_path");
    if (!path.isArray()) {
      return List.of();
    }
    return objectMapper.convertValue(path, objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
  }
}
