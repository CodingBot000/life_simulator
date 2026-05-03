package com.lifesimulator.backend.simulation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.config.SimulatorProperties;
import com.lifesimulator.backend.llm.CodexCliClient;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class SimulationService {

  private static final List<String> STAGES = List.of(
    "state_loader",
    "planner",
    "scenario_a",
    "scenario_b",
    "risk_a",
    "risk_b",
    "ab_reasoning",
    "guardrail",
    "advisor",
    "reflection"
  );

  private final ObjectMapper objectMapper;
  private final SimulatorProperties properties;
  private final CodexCliClient codexCliClient;
  private final SimulationResponseFactory responseFactory;

  public SimulationService(
    ObjectMapper objectMapper,
    SimulatorProperties properties,
    CodexCliClient codexCliClient,
    SimulationResponseFactory responseFactory
  ) {
    this.objectMapper = objectMapper;
    this.properties = properties;
    this.codexCliClient = codexCliClient;
    this.responseFactory = responseFactory;
  }

  public String model() {
    return properties.getCodex().getModel();
  }

  public JsonNode run(
    JsonNode request,
    String traceId,
    String locale,
    SimulationProgressWriter progress
  ) throws IOException {
    String requestId = UUID.randomUUID().toString();
    responseFactory.validateRequest(request);

    write(progress, Map.of("type", "request_started", "request_id", requestId, "trace_id", traceId));
    write(
      progress,
      Map.of(
        "type",
        "routing_resolved",
        "request_id",
        requestId,
        "execution_mode",
        "full",
        "selected_path",
        List.of("state_loader", "planner", "scenario", "risk", "ab_reasoning", "guardrail", "advisor", "reflection"),
        "skipped_stages",
        List.of()
      )
    );

    JsonNode deterministic = responseFactory.deterministicResponse(requestId, request, locale, model());
    JsonNode generated = null;
    if (properties.getCodex().isEnabled()) {
      try {
        for (String stage : STAGES) {
          write(progress, stageEvent("stage_started", requestId, stage));
        }
        generated = codexCliClient.completeJson(buildPrompt(requestId, traceId, locale, request), responseFactory.outputSchema());
      } catch (RuntimeException error) {
        if (!properties.getCodex().isFallbackOnError()) {
          throw error;
        }
      } finally {
        for (String stage : STAGES) {
          write(progress, stageEvent("stage_completed", requestId, stage));
        }
      }
    }

    return responseFactory.mergeGenerated(deterministic, generated, requestId);
  }

  private Map<String, Object> stageEvent(String type, String requestId, String stage) {
    String executionKind = ("guardrail".equals(stage) || "reflection".equals(stage)) ? "derived" : "llm";
    String stageModel = "llm".equals(executionKind) ? model() : "spring-derived";
    return Map.of(
      "type",
      type,
      "request_id",
      requestId,
      "stage_name",
      stage,
      "execution_kind",
      executionKind,
      "model",
      stageModel
    );
  }

  private void write(SimulationProgressWriter progress, Object event) throws IOException {
    if (progress != null) {
      progress.write(event);
    }
  }

  private String buildPrompt(String requestId, String traceId, String locale, JsonNode request) throws IOException {
    return String.join(
      "\n",
      "You are the Spring Boot backend for Life Simulator.",
      "Use Codex CLI subscription authentication only. Do not ask for or mention OPENAI_API_KEY.",
      "Return exactly one JSON object that matches the Life Simulator SimulationResponse shape.",
      "Use the same field names as the existing frontend: routing, stateContext, planner, scenarioA, scenarioB, riskA, riskB, reasoning, guardrail, advisor, reflection.",
      "Prefer concise Korean user-facing text when ui_locale is ko. Prefer concise English when ui_locale is en.",
      "Keep arrays non-empty where the UI maps over them.",
      "request_id: " + requestId,
      "trace_id: " + traceId,
      "ui_locale: " + locale,
      "model: " + model(),
      "Input JSON:",
      objectMapper.writeValueAsString(request)
    );
  }
}
