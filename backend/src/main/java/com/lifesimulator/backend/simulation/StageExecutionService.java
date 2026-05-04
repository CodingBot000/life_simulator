package com.lifesimulator.backend.simulation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifesimulator.backend.config.SimulatorProperties;
import com.lifesimulator.backend.guardrail.GuardrailEvaluationService;
import com.lifesimulator.backend.llm.CodexCliClient;
import com.lifesimulator.backend.routing.BackendRoutingDecision;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class StageExecutionService {

  private final CodexCliClient codexCliClient;
  private final GuardrailEvaluationService guardrailEvaluationService;
  private final JsonSchemaBuilder schemaBuilder;
  private final ObjectMapper objectMapper;
  private final SimulatorProperties properties;
  private final StageInputFactory inputFactory;
  private final StagePromptRepository promptRepository;

  public StageExecutionService(
    CodexCliClient codexCliClient,
    GuardrailEvaluationService guardrailEvaluationService,
    JsonSchemaBuilder schemaBuilder,
    ObjectMapper objectMapper,
    SimulatorProperties properties,
    StageInputFactory inputFactory,
    StagePromptRepository promptRepository
  ) {
    this.codexCliClient = codexCliClient;
    this.guardrailEvaluationService = guardrailEvaluationService;
    this.schemaBuilder = schemaBuilder;
    this.objectMapper = objectMapper;
    this.properties = properties;
    this.inputFactory = inputFactory;
    this.promptRepository = promptRepository;
  }

  public JsonNode runStages(
    JsonNode request,
    ObjectNode response,
    String requestId,
    String traceId,
    String locale,
    BackendRoutingDecision routingDecision,
    List<SimulationStage> stages,
    SimulationProgressWriter progress
  ) throws IOException {
    for (SimulationStage stage : stages) {
      write(progress, stageEvent("stage_started", requestId, stage));
      StageRunResult result = runStage(request, response, requestId, traceId, locale, routingDecision, stage);
      response.set(stage.responseField(), result.output());
      write(progress, stageCompletedEvent(requestId, stage, result));
    }
    return response;
  }

  private StageRunResult runStage(
    JsonNode request,
    ObjectNode response,
    String requestId,
    String traceId,
    String locale,
    BackendRoutingDecision routingDecision,
    SimulationStage stage
  ) throws IOException {
    JsonNode fallback = response.path(stage.responseField()).deepCopy();
    if (stage.isDerivedOnly()) {
      return StageRunResult.derived(guardrailEvaluationService.evaluate(response, routingDecision));
    }
    if (!properties.getCodex().isEnabled()) {
      return StageRunResult.fallback(fallback, "codex_disabled");
    }

    try {
      JsonNode output = codexCliClient.completeJson(
        buildPrompt(request, response, requestId, traceId, locale, routingDecision, stage),
        schemaBuilder.schemaFor(fallback)
      );
      return StageRunResult.llm(output, properties.getCodex().getModel());
    } catch (RuntimeException error) {
      if (!properties.getCodex().isFallbackOnError()) {
        throw error;
      }
      return StageRunResult.fallback(fallback, fallbackReason(error));
    }
  }

  private String buildPrompt(
    JsonNode request,
    ObjectNode response,
    String requestId,
    String traceId,
    String locale,
    BackendRoutingDecision routingDecision,
    SimulationStage stage
  ) throws IOException {
    JsonNode stageInput = inputFactory.inputFor(stage, requestId, locale, request, response, routingDecision);
    return String.join(
      "\n\n",
      "You are running one Life Simulator backend stage.",
      "Use Codex CLI subscription authentication only. Do not ask for OPENAI_API_KEY.",
      "Return exactly one JSON object for the requested stage, not the full response.",
      "Stage: " + stage.stageName(),
      "Request ID: " + requestId,
      "Trace ID: " + traceId,
      "UI locale: " + locale,
      "Execution mode: " + routingDecision.executionMode(),
      "Stage prompt:",
      promptRepository.promptFor(stage),
      "Stage input JSON:",
      objectMapper.writeValueAsString(stageInput)
    );
  }

  private Map<String, Object> stageEvent(String type, String requestId, SimulationStage stage) {
    String executionKind = stage.isDerivedOnly() ? "derived" : "llm";
    String stageModel = "llm".equals(executionKind) ? properties.getCodex().getModel() : "spring-derived";
    return Map.of(
      "type",
      type,
      "request_id",
      requestId,
      "stage_name",
      stage.stageName(),
      "execution_kind",
      executionKind,
      "model",
      stageModel
    );
  }

  private Map<String, Object> stageCompletedEvent(
    String requestId,
    SimulationStage stage,
    StageRunResult result
  ) {
    Map<String, Object> event = new LinkedHashMap<>();
    event.put("type", "stage_completed");
    event.put("request_id", requestId);
    event.put("stage_name", stage.stageName());
    event.put("execution_kind", result.executionKind());
    event.put("model", result.model());
    event.put("fallback_used", result.fallbackUsed());
    if (result.fallbackReason() != null) {
      event.put("fallback_reason", result.fallbackReason());
    }
    return event;
  }

  private String fallbackReason(RuntimeException error) {
    String message = error.getMessage();
    if (message == null || message.isBlank()) {
      return error.getClass().getSimpleName();
    }
    return message.length() > 180 ? message.substring(0, 180) + "..." : message;
  }

  private void write(SimulationProgressWriter progress, Object event) throws IOException {
    if (progress != null) {
      progress.write(event);
    }
  }

  private record StageRunResult(
    JsonNode output,
    String executionKind,
    String model,
    boolean fallbackUsed,
    String fallbackReason
  ) {
    private static StageRunResult llm(JsonNode output, String model) {
      return new StageRunResult(output, "llm", model, false, null);
    }

    private static StageRunResult derived(JsonNode output) {
      return new StageRunResult(output, "derived", "spring-derived", false, null);
    }

    private static StageRunResult fallback(JsonNode output, String fallbackReason) {
      return new StageRunResult(output, "deterministic", "fallback", true, fallbackReason);
    }
  }
}
