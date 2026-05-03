package com.lifesimulator.backend.simulation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.config.SimulatorProperties;
import com.lifesimulator.backend.llm.CodexCliClient;
import com.lifesimulator.backend.routing.BackendRoutingDecision;
import com.lifesimulator.backend.routing.SimulationRouter;
import java.io.IOException;
import java.util.ArrayList;
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
  private final SimulationEnvelopeFactory envelopeFactory;
  private final SimulationRouter router;

  public SimulationService(
    ObjectMapper objectMapper,
    SimulatorProperties properties,
    CodexCliClient codexCliClient,
    SimulationResponseFactory responseFactory,
    SimulationEnvelopeFactory envelopeFactory,
    SimulationRouter router
  ) {
    this.objectMapper = objectMapper;
    this.properties = properties;
    this.codexCliClient = codexCliClient;
    this.responseFactory = responseFactory;
    this.envelopeFactory = envelopeFactory;
    this.router = router;
  }

  public String model() {
    return properties.getCodex().getModel();
  }

  public SimulationRunResult run(
    JsonNode request,
    String traceId,
    String locale,
    SimulationProgressWriter progress
  ) throws IOException {
    String requestId = UUID.randomUUID().toString();
    long startedAtMillis = System.currentTimeMillis();
    responseFactory.validateRequest(request);
    BackendRoutingDecision routingDecision = router.route(request, model());
    List<String> stages = stageNames(routingDecision);

    write(progress, Map.of("type", "request_started", "request_id", requestId, "trace_id", traceId));
    write(
      progress,
      Map.of(
        "type",
        "routing_resolved",
        "request_id",
        requestId,
        "execution_mode",
        routingDecision.executionMode(),
        "selected_path",
        routingDecision.selectedPath(),
        "skipped_stages",
        skippedStages(routingDecision)
      )
    );

    JsonNode deterministic = responseFactory.deterministicResponse(requestId, request, locale, routingDecision);
    JsonNode generated = null;
    if (properties.getCodex().isEnabled()) {
      try {
        for (String stage : stages) {
          write(progress, stageEvent("stage_started", requestId, stage));
        }
        generated = codexCliClient.completeJson(
          buildPrompt(requestId, traceId, locale, routingDecision, request),
          responseFactory.outputSchema()
        );
      } catch (RuntimeException error) {
        if (!properties.getCodex().isFallbackOnError()) {
          throw error;
        }
      } finally {
        for (String stage : stages) {
          write(progress, stageEvent("stage_completed", requestId, stage));
        }
      }
    } else {
      for (String stage : stages) {
        write(progress, stageEvent("stage_started", requestId, stage));
        write(progress, stageEvent("stage_completed", requestId, stage));
      }
    }

    JsonNode response = responseFactory.mergeGenerated(deterministic, generated, requestId);
    return new SimulationRunResult(
      response,
      envelopeFactory.create(request, response, traceId, startedAtMillis, stages)
    );
  }

  private List<String> stageNames(BackendRoutingDecision routingDecision) {
    List<String> stages = new ArrayList<>();
    stages.add("state_loader");
    stages.add("planner");
    if (routingDecision.selectedPath().contains("scenario")) {
      stages.add("scenario_a");
      stages.add("scenario_b");
    }
    if (routingDecision.selectedPath().contains("risk")) {
      stages.add("risk_a");
      stages.add("risk_b");
    }
    if (routingDecision.selectedPath().contains("ab_reasoning")) {
      stages.add("ab_reasoning");
    }
    stages.add("guardrail");
    stages.add("advisor");
    if (routingDecision.selectedPath().contains("reflection")) {
      stages.add("reflection");
    }
    return stages;
  }

  private List<String> skippedStages(BackendRoutingDecision routingDecision) {
    return STAGES.stream()
      .filter(stage -> !stageNames(routingDecision).contains(stage))
      .toList();
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

  private String buildPrompt(
    String requestId,
    String traceId,
    String locale,
    BackendRoutingDecision routingDecision,
    JsonNode request
  ) throws IOException {
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
      "execution_mode: " + routingDecision.executionMode(),
      "selected_path: " + objectMapper.writeValueAsString(routingDecision.selectedPath()),
      "Input JSON:",
      objectMapper.writeValueAsString(request)
    );
  }
}
