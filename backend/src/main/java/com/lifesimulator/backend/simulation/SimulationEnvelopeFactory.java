package com.lifesimulator.backend.simulation;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifesimulator.backend.logging.SimulationExecutionEnvelope;
import com.lifesimulator.backend.logging.SimulationStageLog;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class SimulationEnvelopeFactory {

  private final ObjectMapper objectMapper;

  public SimulationEnvelopeFactory(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
  }

  public SimulationExecutionEnvelope create(
    JsonNode request,
    JsonNode response,
    String traceId,
    long startedAtMillis,
    List<StageExecutionRecord> stageRecords
  ) {
    Instant createdAt = Instant.now();
    String requestId = response.path("request_id").asText();
    String executionMode = response.at("/routing/execution_mode").asText("full");
    List<String> selectedPath = stringList(response.at("/routing/selected_path"));
    String selectedModel = selectedModel(response, stageRecords);
    List<SimulationStageLog> stageLogs = stageLogs(
      requestId,
      traceId,
      executionMode,
      selectedPath,
      selectedModel,
      request,
      response,
      stageRecords,
      createdAt
    );
    int totalTokens = stageRecords.stream().mapToInt(StageExecutionRecord::totalTokens).sum();
    double estimatedCostUsd = stageRecords
      .stream()
      .mapToDouble(StageExecutionRecord::estimatedCostUsd)
      .sum();
    boolean fallbackUsed = stageRecords.stream().anyMatch(StageExecutionRecord::fallbackUsed);
    int retryCount = stageRecords.stream().mapToInt(StageExecutionRecord::retryCount).sum();
    boolean cacheHit = stageRecords.stream().anyMatch(StageExecutionRecord::cacheHit);
    boolean schemaValid = stageRecords.stream().allMatch(StageExecutionRecord::schemaValid);
    int schemaFailureCount = (int) stageRecords
      .stream()
      .filter(stage -> !stage.schemaValid())
      .count();
    return new SimulationExecutionEnvelope(
      requestId,
      traceId,
      "simulate",
      executionMode,
      selectedPath,
      selectedModel,
      response.at("/advisor/decision").asText("undecided"),
      response.at("/advisor/confidence").asDouble(0),
      response.path("guardrail"),
      Math.max(0, (int) (System.currentTimeMillis() - startedAtMillis)),
      totalTokens,
      estimatedCostUsd,
      fallbackUsed,
      retryCount,
      cacheHit,
      schemaValid,
      schemaFailureCount,
      request.deepCopy(),
      response.deepCopy(),
      stageLogs,
      createdAt
    );
  }

  private List<SimulationStageLog> stageLogs(
    String requestId,
    String traceId,
    String executionMode,
    List<String> selectedPath,
    String selectedModel,
    JsonNode request,
    JsonNode response,
    List<StageExecutionRecord> stageRecords,
    Instant createdAt
  ) {
    List<SimulationStageLog> logs = new ArrayList<>();
    for (StageExecutionRecord stage : stageRecords) {
      logs.add(
        new SimulationStageLog(
          requestId,
          traceId,
          "simulate",
          executionMode,
          selectedPath,
          stage.stageName(),
          stageModel(response, stage, selectedModel),
          stage.executionKind(),
          stage.latencyMs(),
          stage.inputTokens(),
          stage.cachedInputTokens(),
          stage.outputTokens(),
          stage.totalTokens(),
          stage.estimatedCostUsd(),
          stage.fallbackUsed(),
          stage.retryCount(),
          stage.cacheHit(),
          stage.schemaValid(),
          stage.schemaValid() ? 0 : 1,
          stage.errorCode(),
          request.deepCopy(),
          responseForStage(response, stage.stageName()),
          createdAt
        )
      );
    }
    return logs;
  }

  private JsonNode responseForStage(JsonNode response, String stageName) {
    String responseField = switch (stageName) {
      case "state_loader" -> "stateContext";
      case "scenario_a" -> "scenarioA";
      case "scenario_b" -> "scenarioB";
      case "risk_a" -> "riskA";
      case "risk_b" -> "riskB";
      case "ab_reasoning" -> "reasoning";
      default -> stageName;
    };
    JsonNode stageResponse = response.path(responseField);
    return stageResponse.isMissingNode() ? objectMapper.createObjectNode() : stageResponse.deepCopy();
  }

  private String modelForStage(JsonNode response, String stageName, String selectedModel) {
    return response.at("/routing/stage_model_plan/" + stageName).asText(selectedModel);
  }

  private String selectedModel(JsonNode response, List<StageExecutionRecord> stageRecords) {
    return stageRecords
      .stream()
      .filter(stage -> "advisor".equals(stage.stageName()))
      .map(StageExecutionRecord::model)
      .filter(model -> model != null && !model.isBlank())
      .findFirst()
      .orElse(response.at("/routing/stage_model_plan/advisor").asText("unknown"));
  }

  private String stageModel(
    JsonNode response,
    StageExecutionRecord stage,
    String selectedModel
  ) {
    return stage.model().isBlank()
      ? modelForStage(response, stage.stageName(), selectedModel)
      : stage.model();
  }

  private List<String> stringList(JsonNode value) {
    if (!value.isArray()) {
      return List.of();
    }
    List<String> values = new ArrayList<>();
    value.forEach(item -> values.add(item.asText()));
    return values;
  }
}
