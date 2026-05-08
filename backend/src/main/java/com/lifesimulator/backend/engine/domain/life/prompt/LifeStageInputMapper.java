package com.lifesimulator.backend.engine.domain.life.prompt;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.lifesimulator.backend.engine.prompt.StageInputMapper;
import com.lifesimulator.backend.routing.BackendRoutingDecision;
import com.lifesimulator.backend.simulation.SimulationStage;
import org.springframework.stereotype.Component;

@Component
public class LifeStageInputMapper implements StageInputMapper {

  private final LifeOptionSelector optionSelector;
  private final ObjectMapper objectMapper;

  public LifeStageInputMapper(ObjectMapper objectMapper, LifeOptionSelector optionSelector) {
    this.objectMapper = objectMapper;
    this.optionSelector = optionSelector;
  }

  @Override
  public JsonNode inputFor(
    SimulationStage stage,
    String requestId,
    String locale,
    JsonNode request,
    JsonNode response,
    BackendRoutingDecision routingDecision
  ) {
    ObjectNode input = objectMapper.createObjectNode();
    input.put("caseId", requestId);
    input.put("outputLocale", locale);
    input.set("caseInput", request);
    input.set("routing", response.path("routing"));
    input.set("stateContext", response.path("stateContext"));
    input.set("plannerResult", response.path("planner"));
    input.set("scenarioA", response.path("scenarioA"));
    input.set("scenarioB", response.path("scenarioB"));
    input.set("riskA", response.path("riskA"));
    input.set("riskB", response.path("riskB"));
    input.set("abReasoning", response.path("reasoning"));
    input.set("guardrailResult", response.path("guardrail"));
    input.set("advisorResult", response.path("advisor"));
    input.put("stageName", stage.stageName());
    input.put("executionMode", routingDecision.executionMode());
    String optionLabel = optionSelector.optionLabelFor(stage);
    if (!optionLabel.isBlank()) {
      input.put("optionLabel", optionLabel);
      input.put("selectedOption", optionSelector.selectedOptionFor(stage, request));
    }
    return input;
  }
}
