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
    List<String> stageNames
  ) {
    Instant createdAt = Instant.now();
    String requestId = response.path("request_id").asText();
    String executionMode = response.at("/routing/execution_mode").asText("full");
    List<String> selectedPath = stringList(response.at("/routing/selected_path"));
    String selectedModel = response.at("/routing/stage_model_plan/advisor").asText("unknown");
    List<SimulationStageLog> stageLogs = stageLogs(
      requestId,
      traceId,
      executionMode,
      selectedPath,
      selectedModel,
      request,
      response,
      stageNames,
      createdAt
    );

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
      0,
      0,
      false,
      0,
      false,
      true,
      0,
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
    List<String> stageNames,
    Instant createdAt
  ) {
    List<SimulationStageLog> logs = new ArrayList<>();
    for (String stageName : stageNames) {
      logs.add(
        new SimulationStageLog(
          requestId,
          traceId,
          "simulate",
          executionMode,
          selectedPath,
          stageName,
          modelForStage(response, stageName, selectedModel),
          executionKind(stageName),
          0,
          0,
          0,
          0,
          0,
          false,
          0,
          false,
          true,
          0,
          request.deepCopy(),
          responseForStage(response, stageName),
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

  private String executionKind(String stageName) {
    return "guardrail".equals(stageName) ? "derived" : "llm";
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
