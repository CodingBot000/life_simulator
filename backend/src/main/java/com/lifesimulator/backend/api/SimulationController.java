package com.lifesimulator.backend.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.logging.SimulationLogService;
import com.lifesimulator.backend.simulation.SimulationProgressWriter;
import com.lifesimulator.backend.simulation.SimulationRunResult;
import com.lifesimulator.backend.simulation.SimulationService;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
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
  private final SimulationLogService simulationLogService;
  private final SimulationService simulationService;

  public SimulationController(
    ObjectMapper objectMapper,
    SimulationLogService simulationLogService,
    SimulationService simulationService
  ) {
    this.objectMapper = objectMapper;
    this.simulationLogService = simulationLogService;
    this.simulationService = simulationService;
  }

  @PostMapping("/api/simulate")
  public ResponseEntity<?> simulate(
    @RequestBody JsonNode body,
    @RequestHeader HttpHeaders headers
  ) throws IOException {
    String traceId = firstHeader(headers, "x-trace-id", UUID.randomUUID().toString());
    String locale = firstHeader(headers, "x-ui-locale", "ko");

    if ("ndjson".equals(firstHeader(headers, "x-simulate-stream", ""))) {
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
              error.getMessage(),
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

  private String firstHeader(HttpHeaders headers, String name, String fallback) {
    String value = headers.getFirst(name);
    return value == null || value.isBlank() ? fallback : value.trim();
  }

  private List<String> selectedPath(JsonNode response) {
    JsonNode path = response.at("/routing/selected_path");
    if (!path.isArray()) {
      return List.of();
    }
    return objectMapper.convertValue(path, objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
  }
}
