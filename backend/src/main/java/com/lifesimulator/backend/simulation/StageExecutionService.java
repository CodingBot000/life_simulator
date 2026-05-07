package com.lifesimulator.backend.simulation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifesimulator.backend.guardrail.GuardrailEvaluationService;
import com.lifesimulator.backend.llm.LlmClientException;
import com.lifesimulator.backend.llm.LlmJsonClient;
import com.lifesimulator.backend.llm.LlmJsonRequest;
import com.lifesimulator.backend.llm.LlmJsonResult;
import com.lifesimulator.backend.routing.BackendRoutingDecision;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class StageExecutionService {

  private final GuardrailEvaluationService guardrailEvaluationService;
  private final JsonSchemaBuilder schemaBuilder;
  private final LlmJsonClient llmJsonClient;
  private final ObjectMapper objectMapper;
  private final StageInputFactory inputFactory;
  private final StagePromptRepository promptRepository;

  public StageExecutionService(
    GuardrailEvaluationService guardrailEvaluationService,
    JsonSchemaBuilder schemaBuilder,
    LlmJsonClient llmJsonClient,
    ObjectMapper objectMapper,
    StageInputFactory inputFactory,
    StagePromptRepository promptRepository
  ) {
    this.guardrailEvaluationService = guardrailEvaluationService;
    this.schemaBuilder = schemaBuilder;
    this.llmJsonClient = llmJsonClient;
    this.objectMapper = objectMapper;
    this.inputFactory = inputFactory;
    this.promptRepository = promptRepository;
  }

  public List<StageExecutionRecord> runStages(
    JsonNode request,
    ObjectNode response,
    String requestId,
    String traceId,
    String locale,
    BackendRoutingDecision routingDecision,
    List<SimulationStage> stages,
    SimulationProgressWriter progress
  ) throws IOException {
    List<StageExecutionRecord> records = new ArrayList<>();
    for (SimulationStage stage : stages) {
      write(progress, stageEvent("stage_started", requestId, stage));
      StageRunResult result = runStage(request, response, requestId, traceId, locale, routingDecision, stage);
      response.set(stage.responseField(), result.output());
      write(progress, stageCompletedEvent(requestId, stage, result));
      records.add(result.executionRecord());
    }
    return records;
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
      return StageRunResult.derived(
        stage.stageName(),
        guardrailEvaluationService.evaluate(response, routingDecision)
      );
    }
    if (!llmJsonClient.enabled()) {
      return StageRunResult.fallback(
        stage.stageName(),
        fallback,
        llmJsonClient.providerName() + "_disabled"
      );
    }

    try {
      LlmJsonResult result = llmJsonClient.completeJson(
        new LlmJsonRequest(
          stage.stageName(),
          buildPrompt(request, response, requestId, traceId, locale, routingDecision, stage),
          schemaBuilder.schemaFor(fallback),
          fallback
        )
      );
      return StageRunResult.llm(stage.stageName(), result);
    } catch (RuntimeException error) {
      if (!shouldFallback(error)) {
        throw error;
      }
      return StageRunResult.fallback(stage.stageName(), fallback, fallbackReason(error));
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
      "Return exactly one JSON object that matches the requested stage schema.",
      "Return the requested stage output only, not the full response.",
      "Stage: " + stage.stageName(),
      "Stage prompt:",
      promptRepository.promptFor(stage),
      "Runtime metadata:",
      objectMapper.writeValueAsString(
        Map.of(
          "request_id",
          requestId,
          "trace_id",
          traceId,
          "ui_locale",
          locale,
          "execution_mode",
          routingDecision.executionMode()
        )
      ),
      "Stage input JSON:",
      objectMapper.writeValueAsString(stageInput)
    );
  }

  private Map<String, Object> stageEvent(String type, String requestId, SimulationStage stage) {
    String executionKind = stage.isDerivedOnly() ? "derived" : "llm";
    String stageModel = "llm".equals(executionKind) ? llmJsonClient.modelName() : "spring-derived";
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
    event.put("execution_kind", result.executionRecord().executionKind());
    event.put("model", result.executionRecord().model());
    event.put("fallback_used", result.executionRecord().fallbackUsed());
    event.put("latency_ms", result.executionRecord().latencyMs());
    event.put("total_tokens", result.executionRecord().totalTokens());
    event.put("cache_hit", result.executionRecord().cacheHit());
    if (result.executionRecord().errorCode() != null) {
      event.put("fallback_reason", result.executionRecord().errorCode());
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

  private boolean shouldFallback(RuntimeException error) {
    if (error instanceof LlmClientException && isMissingProviderCredential(error)) {
      return false;
    }
    return llmJsonClient.fallbackOnError();
  }

  private boolean isMissingProviderCredential(RuntimeException error) {
    String message = error.getMessage();
    return message != null && message.contains("API key is required");
  }

  private void write(SimulationProgressWriter progress, Object event) throws IOException {
    if (progress != null) {
      progress.write(event);
    }
  }

  private record StageRunResult(
    JsonNode output,
    StageExecutionRecord executionRecord
  ) {
    private static StageRunResult llm(String stageName, LlmJsonResult result) {
      return new StageRunResult(
        result.output(),
        StageExecutionRecord.llm(stageName, "llm", result.model(), result)
      );
    }

    private static StageRunResult derived(String stageName, JsonNode output) {
      return new StageRunResult(
        output,
        StageExecutionRecord.derived(stageName)
      );
    }

    private static StageRunResult fallback(String stageName, JsonNode output, String fallbackReason) {
      return new StageRunResult(output, StageExecutionRecord.fallback(stageName, fallbackReason));
    }
  }
}
